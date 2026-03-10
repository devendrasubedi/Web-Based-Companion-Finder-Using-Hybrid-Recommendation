import mongoose from "mongoose";
import axios from "axios";
import { RecommendationCache } from "../models/recommendation_cache.js";
import { Trail } from "../models/trailModel.js";
import { User } from "../models/user.model.js";
import { UserProfile } from "../models/userProfile.model.js";

const PYTHON_API = process.env.RECOMMENDATION_API_URL || "http://localhost:8000";

// Fire-and-forget: ask Python to (re)compute for this user
function triggerPythonRecompute(userId) {
    axios.post(`${PYTHON_API}/run/user/${userId}`, {}, { timeout: 5000 })
        .catch(() => { /* Python may be down — silently ignore */ });
}

function triggerPythonRecomputeCompanions(userId) {
    axios.post(`${PYTHON_API}/run/companions/${userId}`, {}, { timeout: 5000 })
        .catch(() => { /* Python may be down — silently ignore */ });
}

// Normalize a raw Trail doc to the same shape as getAllTrails returns
function normalizeTrail(t, reason = "") {
    return {
        id: t._id,
        name: t.name,
        difficulty: t.difficulty,
        description: t.description,
        location: t.location || { provinces: [], districts: [], start: "", end: "" },
        duration: t.duration?.min_days ? `${t.duration.min_days} days` : (t.duration || "N/A"),
        cost: t.cost || { min_npr: null, max_npr: null },
        image: t.image || "https://via.placeholder.com/600x400?text=Loading...",
        tags: t.tags || [],
        rating: t.rating || 0,
        numReviews: t.numReviews || 0,
        reason,
    };
}

// Compute age from a dob Date value
function computeAge(dob) {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

// Shape one companion object — all fields ProfileCard + HomePage need
function shapeCompanion(user, profile = {}, reason = "") {
    return {
        _id:             String(user._id),
        id:              String(user._id),
        email:           user.email            || "",
        name:            profile.name          || user.name || "Trekker",
        bio:             profile.bio           || "",
        province:        profile.province      || "",
        district:        profile.district      || "",
        gender:          profile.gender        || "",
        experienceLevel: profile.experienceLevel || "beginner",
        availability:    profile.availability  || "",
        budgetLevel:     profile.budgetLevel   || "",
        interests:       profile.interests     || [],
        languages:       profile.languagesKnown || [],   // ProfileCard reads user.languages
        languagesKnown:  profile.languagesKnown || [],
        age:             computeAge(profile.dob),
        reason,
    };
}

// GET /api/recommendations/trails
export const getTrailRecommendations = async (req, res) => {
    try {
        const userId = req.userId;
        console.log("[REC] Trail request for userId:", userId);

        const cached = await RecommendationCache.findOne({
            userId,
            type: "trails",
            expiresAt: { $gt: new Date() },
        }).lean();

        console.log("[REC] Cache found:", !!cached, "| recs count:", cached?.recommendations?.length ?? 0);

        if (cached && cached.recommendations.length > 0) {
            // Build a lookup: itemId → reason
            const reasonMap = {};
            const orderedIds = cached.recommendations.map(r => {
                reasonMap[r.itemId] = r.reason;
                return r.itemId;
            });

            console.log("[REC] Sample itemIds:", orderedIds.slice(0, 3));

            const trails = await Trail.find({ _id: { $in: orderedIds } }).lean();
            console.log("[REC] Trails fetched from DB:", trails.length);

            // Re-sort to match recommendation order and attach reason
            const indexMap = {};
            orderedIds.forEach((id, i) => { indexMap[id] = i; });
            const sorted = trails
                .sort((a, b) => indexMap[String(a._id)] - indexMap[String(b._id)])
                .map(t => normalizeTrail(t, reasonMap[String(t._id)] || ""));

            return res.status(200).json({
                success: true,
                trails: sorted,
                fromCache: true,
                modelVersion: cached.modelVersion,
            });
        }

        // Cache miss — trigger async recompute and return popular trails as fallback
        triggerPythonRecompute(userId);

        const popular = await Trail.find({}).sort({ rating: -1 }).limit(50).lean();
        return res.status(200).json({
            success: true,
            trails: popular.map(t => normalizeTrail(t)),
            fromCache: false,
            message: "Recommendations being computed, showing popular trails",
        });

    } catch (error) {
        console.error("Recommendation error:", error.message);
        res.status(500).json({ success: false, message: "Recommendation service error" });
    }
};

// GET /api/recommendations/companions
// itemId in cache = companion's userId (ObjectId string)
// UserProfile.userId = same ObjectId → query UserProfile directly (both in auth_db)
export const getCompanionRecommendations = async (req, res) => {
    try {
        const userId = req.userId;
        const { ObjectId } = mongoose.Types;

        const cached = await RecommendationCache.findOne({
            userId,
            type: "companions",
            expiresAt: { $gt: new Date() },
        }).lean();

        if (cached && cached.recommendations.length > 0) {
            // Build rank/reason lookup keyed by itemId string
            const reasonMap = {};
            const orderedIds = cached.recommendations.map(r => {
                reasonMap[r.itemId] = r.reason;
                return r.itemId;
            });

            // Convert itemId strings → ObjectIds for the userId field in UserProfile
            const objectIds = orderedIds
                .filter(id => ObjectId.isValid(id))
                .map(id => new ObjectId(id));

            // Query UserProfile directly — userId IS the itemId, both in auth_db
            const profiles = await UserProfile.find({ userId: { $in: objectIds } }).lean();

            // Map by userId string for O(1) lookup
            const profileMap = {};
            profiles.forEach(p => { profileMap[String(p.userId)] = p; });

            // Re-sort by recommendation rank, attach reason — skip if no profile found
            const companions = orderedIds
                .map(uid => {
                    const p = profileMap[uid];
                    if (!p) return null;  // profile missing / deleted user
                    return shapeCompanion({ _id: uid }, p, reasonMap[uid] || "");
                })
                .filter(Boolean);

            return res.status(200).json({
                success: true,
                companions,
                fromCache: true,
            });
        }

        // Cache miss — trigger async recompute, fall back to all UserProfiles
        triggerPythonRecomputeCompanions(userId);

        const profiles = await UserProfile.find({}).lean();
        const companions = profiles.map(p =>
            shapeCompanion({ _id: p.userId }, p, "")
        );

        return res.status(200).json({
            success: true,
            companions,
            fromCache: false,
        });

    } catch (error) {
        console.error("Companion recommendation error:", error.message);
        res.status(500).json({ success: false, message: "Recommendation service error" });
    }
};