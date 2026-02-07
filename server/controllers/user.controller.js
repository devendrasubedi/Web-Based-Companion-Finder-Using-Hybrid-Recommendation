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
