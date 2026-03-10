import { User } from "../models/user.model.js";
import { UserProfile } from "../models/userProfile.model.js";
import { UserTrailInteraction } from "../models/user_trail_interaction.js";
import { Trail } from "../models/trailModel.js";

// ── Helper: recompute implicitScore (new formula, no saveCount) ─────────────
function computeScore({ isSaved = false, isCompleted = false, rating = null }) {
    return (isSaved ? 3 : 0) + (isCompleted ? 5 : 0) + (rating || 0);
}

// ── GET /api/users/ ──────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        
        if (search && search.trim().length > 0) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { bio: { $regex: search, $options: 'i' } },
                    { province: { $regex: search, $options: 'i' } },
                    { district: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Query the UserProfile collection directly
        const profiles = await UserProfile.find(query)
            .select("-__v -updatedAt -createdAt")
            .limit(20)
            .lean();

        // Format the output to match what the frontend cards expect
        const formattedProfiles = profiles.map(profile => {
            let age = "";
            if (profile.dob) {
                const birthDate = new Date(profile.dob);
                if (!isNaN(birthDate.getTime())) {
                    const today = new Date();
                    age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                }
            }

            return {
                _id: profile.userId, // Map userId back to _id for consistency with old User auth objects
                name: profile.name,
                email: profile.email || "",
                bio: profile.bio || "",
                province: profile.province || "",
                district: profile.district || "",
                age,
                gender: profile.gender || "",
                languages: profile.languagesKnown || [],
                profilePicture: profile.profilePicture || null,
                experienceLevel: profile.experienceLevel || ""
            };
        });

        res.status(200).json(formattedProfiles);
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/users/:id ──────────────────────────────────────────────────────
// Used by ProfilePage when clicking on a companion's card.
// Note: `id` here is the userId (ObjectId string), which is the primary key for UserProfile.
export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch from UserProfile (lives in auth_db, where recommendations come from)
        const userProfile = await UserProfile.findOne({ userId: id }).lean();
        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // 2. Opt-fetch from User (default db) for email
        const user = await User.findById(id).select("-password").lean() || {};

        let age = null;
        if (userProfile.dob) {
            const today = new Date();
            const birthDate = new Date(userProfile.dob);
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        }

        // Merge, ensuring _id is always the semantic userId
        res.status(200).json({
            success: true,
            user: { ...user, ...userProfile, _id: String(userProfile.userId), id: String(userProfile.userId), age }
        });
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ── GET /api/users/interactions (own profile) ────────────────────────────────
export const getUserInteractions = async (req, res) => {
    try {
        const userId = req.userId;

        // Fetch saved and completed in parallel (single collection, filter by boolean)
        const [savedDocs, completedDocs] = await Promise.all([
            UserTrailInteraction.find({ userId, isSaved: true }).lean(),
            UserTrailInteraction.find({ userId, isCompleted: true }).lean()
        ]);

        // Batch-fetch trail names for both sets
        const trailIds = [...new Set([
            ...savedDocs.map(d => d.trailId),
            ...completedDocs.map(d => d.trailId)
        ])];

        const trails = trailIds.length
            ? await Trail.find({ _id: { $in: trailIds } }).select("_id name distance_km altitude").lean()
            : [];
        const trailMap = new Map(trails.map(t => [String(t._id), t]));

        const savedHikes = savedDocs.map(doc => {
            const trail = trailMap.get(String(doc.trailId)) || {};
            return {
                trailId: doc.trailId,
                trailName: trail.name || String(doc.trailId),
                distance_km: trail.distance_km || null,
                savedAt: doc.updatedAt,
                rating: doc.rating
            };
        });

        const pastHikes = completedDocs.map(doc => {
            const trail = trailMap.get(String(doc.trailId)) || {};
            return {
                trailId: doc.trailId,
                trailName: trail.name || String(doc.trailId),
                distance_km: trail.distance_km || null,
                completedAt: doc.completedAt || doc.updatedAt,
                rating: doc.rating
            };
        });

        res.status(200).json({ success: true, savedHikes, pastHikes });
    } catch (error) {
        console.error("Error in getUserInteractions:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ── GET /api/users/:id/interactions (public — another user's profile) ────────
export const getPublicUserInteractions = async (req, res) => {
    try {
        const { id: userId } = req.params;

        const [savedDocs, completedDocs] = await Promise.all([
            UserTrailInteraction.find({ userId, isSaved: true }).lean(),
            UserTrailInteraction.find({ userId, isCompleted: true }).lean()
        ]);

        const trailIds = [...new Set([
            ...savedDocs.map(d => d.trailId),
            ...completedDocs.map(d => d.trailId)
        ])];

        const trails = trailIds.length
            ? await Trail.find({ _id: { $in: trailIds } }).select("_id name distance_km").lean()
            : [];
        const trailMap = new Map(trails.map(t => [String(t._id), t]));

        const savedHikes = savedDocs.map(doc => {
            const trail = trailMap.get(String(doc.trailId)) || {};
            return {
                trailId: doc.trailId,
                trailName: trail.name || String(doc.trailId),
                distance_km: trail.distance_km || null,
                savedAt: doc.updatedAt
            };
        });

        const pastHikes = completedDocs.map(doc => {
            const trail = trailMap.get(String(doc.trailId)) || {};
            return {
                trailId: doc.trailId,
                trailName: trail.name || String(doc.trailId),
                distance_km: trail.distance_km || null,
                completedAt: doc.completedAt || doc.updatedAt
            };
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
        const { trailId } = req.body;

        if (!trailId) return res.status(400).json({ success: false, message: "Trail ID is required" });

        let doc = await UserTrailInteraction.findOne({ userId, trailId });
        if (!doc) doc = new UserTrailInteraction({ userId, trailId });

        doc.isSaved = !doc.isSaved;
        doc.implicitScore = computeScore(doc);
        await doc.save();

        res.status(200).json({
            success: true,
            isSaved: doc.isSaved,
            message: doc.isSaved ? "Trail saved" : "Trail removed from saved"
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
        const { trailId } = req.body;

        if (!trailId) return res.status(400).json({ success: false, message: "Trail ID is required" });

        let doc = await UserTrailInteraction.findOne({ userId, trailId });
        if (!doc) doc = new UserTrailInteraction({ userId, trailId });

        doc.isCompleted = !doc.isCompleted;
        doc.completedAt = doc.isCompleted ? new Date() : null;
        doc.implicitScore = computeScore(doc);
        await doc.save();

        res.status(200).json({
            success: true,
            isCompleted: doc.isCompleted,
            message: doc.isCompleted ? "Trail marked as completed" : "Trail removed from completed"
        });
    } catch (error) {
        console.error("Error in toggleCompletedHike:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ── GET /api/users/suggested-friends ────────────────────────────────────────
// Fetch users for suggested friends (placeholder for recommendation engine)
export const getSuggestedFriends = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const { limit = 10 } = req.query;

        // Fetch users excluding the current user
        const users = await User.find({ _id: { $ne: currentUserId } })
            .select("_id name email")
            .limit(parseInt(limit))
            .lean();

        // Fetch profiles for additional info
        const usersWithProfile = await Promise.all(users.map(async (user) => {
            const profile = await UserProfile.findOne({ userId: user._id })
                .select("profileImage province district bio  languagesKnown")
                .lean();

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                profileImage: profile?.profileImage || null,
                province: profile?.province || "",
                district: profile?.district || "",
                bio: profile?.bio || "",
                languages: profile?.languagesKnown || []
            };
        }));

        res.status(200).json({
            success: true,
            friends: usersWithProfile
        });
    } catch (error) {
        console.error("Error in getSuggestedFriends:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
