import { User } from "../models/user.model.js";
import { UserProfile } from "../models/userProfile.model.js";
import { InteractionAggregate } from "../models/interaction_aggregate.js";
import { UserTrailInteraction } from "../models/user_trail_interaction.js";
import { Trail } from "../models/trailModel.js";

// ── Helper: recompute implicitScore ─────────────────────────────────────────
function computeScore({ saveCount = 0, isCompleted = false, rating = null }) {
    return (saveCount * 3) + (isCompleted ? 5 : 0) + (rating ? rating : 0);
}

// ── Helper: upsert the aggregate and recompute score ────────────────────────
async function upsertAggregate(userId, trailId, fields) {
    let agg = await InteractionAggregate.findOne({ userId, trailId });
    if (!agg) agg = new InteractionAggregate({ userId, trailId });
    Object.assign(agg, fields, { lastInteraction: new Date() });
    agg.implicitScore = computeScore(agg);
    return agg.save();
}

// ── GET /api/users/ ──────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("_id name email").limit(20);

        const usersWithProfile = await Promise.all(users.map(async (user) => {
            const profile = await UserProfile.findOne({ userId: user._id })
                .select("province district dob gender languagesKnown").lean();

            let age = "";
            if (profile?.dob) {
                const birthDate = new Date(profile.dob);
                if (!isNaN(birthDate.getTime())) {
                    const today = new Date();
                    age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                }
            }

            return {
                ...user._doc,
                province: profile?.province || "",
                district: profile?.district || "",
                age,
                gender: profile?.gender || "",
                languages: profile?.languagesKnown || []
            };
        }));

        res.status(200).json(usersWithProfile);
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/users/:id ──────────────────────────────────────────────────────
export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select("-password").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const userProfile = await UserProfile.findOne({ userId: id }).lean();

        let age = null;
        if (userProfile?.dob) {
            const today = new Date();
            const birthDate = new Date(userProfile.dob);
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        }

        res.status(200).json({
            success: true,
            user: { ...user, ...(userProfile || {}), age }
        });
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ── GET /api/users/interactions ─────────────────────────────────────────────
// Reads raw events from User_Trail_Interactions, cross-refs Interaction_Aggregates
// for current toggle state (isCurrentlySaved, isCompleted).
export const getUserInteractions = async (req, res) => {
    try {
        const userId = req.userId;

        // Raw event log: all save/complete/rate events for this user
        const rawEvents = await UserTrailInteraction.find({ userId })
            .sort({ timestamp: -1 })
            .lean();

        // Current state (toggle): one doc per (userId, trailId)
        const aggregates = await InteractionAggregate.find({ userId }).lean();
        const aggMap = new Map(aggregates.map(a => [String(a.trailId), a]));

        // Collect unique trailIds across events
        const trailIds = [...new Set(rawEvents.map(e => String(e.trailId)))];

        // Batch-fetch trail metadata
        const trails = trailIds.length
            ? await Trail.find({ _id: { $in: trailIds } }).select("_id name distance_km altitude").lean()
            : [];
        const trailMap = new Map(trails.map(t => [String(t._id), t]));

        const savedHikes = [];
        const pastHikes = [];
        const ratedTrails = [];

        // We use the aggregate for the authoritative current state
        aggregates.forEach(agg => {
            const trail = trailMap.get(String(agg.trailId)) || {};
            const entry = {
                trailId: agg.trailId,
                trailName: trail.name || String(agg.trailId),
                distance_km: trail.distance_km || null,
                rating: agg.rating
            };

            if (agg.isCurrentlySaved) {
                savedHikes.push({ ...entry, savedAt: agg.updatedAt });
            }
            if (agg.isCompleted) {
                pastHikes.push({ ...entry, completedAt: agg.completedAt });
            }
            if (agg.rating != null) {
                ratedTrails.push({ ...entry, ratedAt: agg.updatedAt });
            }
        });

        // Also expose the raw event log for the recommendation engine / debugging
        const recentEvents = rawEvents.slice(0, 50).map(e => ({
            trailId: e.trailId,
            trailName: trailMap.get(String(e.trailId))?.name || String(e.trailId),
            interactionType: e.interactionType,
            rating: e.rating,
            source: e.source,
            timestamp: e.timestamp
        }));

        res.status(200).json({ success: true, savedHikes, pastHikes, ratedTrails, recentEvents });
    } catch (error) {
        console.error("Error in getUserInteractions:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ── GET /api/users/:id/interactions — public view of another user ───────────
export const getPublicUserInteractions = async (req, res) => {
    try {
        const { id: userId } = req.params;

        const aggregates = await InteractionAggregate.find({ userId }).lean();
        const trailIds = aggregates.map(a => a.trailId);
        const trails = trailIds.length
            ? await Trail.find({ _id: { $in: trailIds } }).select("_id name distance_km").lean()
            : [];
        const trailMap = new Map(trails.map(t => [String(t._id), t]));

        const savedHikes = [];
        const pastHikes = [];

        aggregates.forEach(agg => {
            const trail = trailMap.get(String(agg.trailId)) || {};
            const entry = {
                trailId: agg.trailId,
                trailName: trail.name || String(agg.trailId),
                distance_km: trail.distance_km || null
            };
            if (agg.isCurrentlySaved) savedHikes.push({ ...entry, savedAt: agg.updatedAt });
            if (agg.isCompleted) pastHikes.push({ ...entry, completedAt: agg.completedAt });
        });

        res.status(200).json({ success: true, savedHikes, pastHikes });
    } catch (error) {
        console.error("Error in getPublicUserInteractions:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ── POST /api/users/saved-hikes ──────────────────────────────────────────────
export const toggleSavedHike = async (req, res) => {
    try {
        const userId = req.userId;
        const { trailId, source = "browse" } = req.body;

        if (!trailId) return res.status(400).json({ success: false, message: "Trail ID is required" });

        // Read current aggregate state for toggle logic
        let agg = await InteractionAggregate.findOne({ userId, trailId });
        const isSaved = agg ? !agg.isCurrentlySaved : true; // first time → save

        // 1. Log raw event to User_Trail_Interactions (every save is logged)
        if (isSaved) {
            await UserTrailInteraction.create({
                userId,
                trailId,
                interactionType: "save",
                source: ["search", "recommendation", "browse", "shared", "unknown"].includes(source)
                    ? source : "unknown",
                timestamp: new Date()
            });
        }

        // 2. Upsert Interaction_Aggregate (tracks current toggle state)
        if (!agg) agg = new InteractionAggregate({ userId, trailId });
        if (isSaved) agg.saveCount = (agg.saveCount || 0) + 1;
        agg.isCurrentlySaved = isSaved;
        agg.lastInteraction = new Date();
        agg.implicitScore = computeScore(agg);
        await agg.save();

        res.status(200).json({
            success: true,
            isSaved,
            message: isSaved ? "Trail saved" : "Trail removed from saved"
        });
    } catch (error) {
        console.error("Error in toggleSavedHike:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ── POST /api/users/completed-hikes ─────────────────────────────────────────
export const toggleCompletedHike = async (req, res) => {
    try {
        const userId = req.userId;
        const { trailId, source = "browse" } = req.body;

        if (!trailId) return res.status(400).json({ success: false, message: "Trail ID is required" });

        let agg = await InteractionAggregate.findOne({ userId, trailId });
        const isCompleted = agg ? !agg.isCompleted : true;

        // 1. Log raw event
        if (isCompleted) {
            await UserTrailInteraction.create({
                userId,
                trailId,
                interactionType: "complete",
                source: ["search", "recommendation", "browse", "shared", "unknown"].includes(source)
                    ? source : "unknown",
                timestamp: new Date()
            });
        }

        // 2. Upsert aggregate
        if (!agg) agg = new InteractionAggregate({ userId, trailId });
        agg.isCompleted = isCompleted;
        agg.completedAt = isCompleted ? new Date() : null;
        agg.lastInteraction = new Date();
        agg.implicitScore = computeScore(agg);
        await agg.save();

        res.status(200).json({
            success: true,
            isCompleted,
            message: isCompleted ? "Trail marked as completed" : "Trail removed from completed"
        });
    } catch (error) {
        console.error("Error in toggleCompletedHike:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
