import { User } from "../models/user.model.js";
import { UserProfile } from "../models/userProfile.model.js";

// Get all users (minimal info for cards/homepage)
export const getAllUsers = async (req, res) => {
    try {
        console.log('getAllUsers endpoint hit');
        const users = await User.find({}).select("_id name email").limit(20);
        console.log('Users found:', users.length);
        res.status(200).json(users);
    } catch (error) {
        console.log("Error in getAllUsers: ", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userProfile = await UserProfile.findOne({ userId: id });

        res.status(200).json({
            success: true,
            user: {
                ...user._doc,
                ...userProfile?._doc
            }
        });

    } catch (error) {
        console.log("Error in getUserProfile: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const toggleSavedHike = async (req, res) => {
    try {
        const userId = req.userId;
        const { trailId, trailName } = req.body;

        if (!trailId) {
            return res.status(400).json({ success: false, message: "Trail ID is required" });
        }

        const userProfile = await UserProfile.findOne({ userId });

        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Check if hike is already saved
        // We handle both string IDs and objects with id/name to support the mixed schema
        const existingIndex = userProfile.savedHikes.findIndex(hike => {
            const id = typeof hike === 'string' ? hike : hike.id || hike._id;
            return id.toString() === trailId.toString();
        });

        let isSaved = false;

        if (existingIndex > -1) {
            // Remove
            userProfile.savedHikes.splice(existingIndex, 1);
            isSaved = false;
        } else {
            // Add
            // Storing as object to keep the name immediately available for UI
            userProfile.savedHikes.push({
                id: trailId,
                name: trailName || "Unknown Trail",
                savedAt: new Date()
            });
            isSaved = true;
        }

        await userProfile.save();

        res.status(200).json({
            success: true,
            isSaved,
            savedHikes: userProfile.savedHikes,
            message: isSaved ? "Trail saved to profile" : "Trail removed from profile"
        });

    } catch (error) {
        console.log("Error in toggleSavedHike: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const toggleCompletedHike = async (req, res) => {
    try {
        const userId = req.userId;
        const { trailId, trailName } = req.body;

        if (!trailId) {
            return res.status(400).json({ success: false, message: "Trail ID is required" });
        }

        const userProfile = await UserProfile.findOne({ userId });

        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Check if hike is already marked as completed
        const existingIndex = userProfile.pastHikes.findIndex(hike => {
            const id = typeof hike === 'string' ? hike : hike.id || hike._id;
            return id.toString() === trailId.toString();
        });

        let isCompleted = false;

        if (existingIndex > -1) {
            // Remove from completed
            userProfile.pastHikes.splice(existingIndex, 1);
            isCompleted = false;
        } else {
            // Add to completed
            userProfile.pastHikes.push({
                id: trailId,
                name: trailName || "Unknown Trail",
                completedAt: new Date()
            });
            isCompleted = true;
        }

        await userProfile.save();

        res.status(200).json({
            success: true,
            isCompleted,
            pastHikes: userProfile.pastHikes,
            message: isCompleted ? "Trail marked as completed" : "Trail removed from completed"
        });

    } catch (error) {
        console.log("Error in toggleCompletedHike: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
