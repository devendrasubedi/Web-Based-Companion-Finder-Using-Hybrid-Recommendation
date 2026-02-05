import { userModel } from '../models/userModel.js';

// Get all users (minimal profile for cards / suggestions)
export const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find({}).select('name province district interests createdAt');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get user profile by ID
export const getUserProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.params.id); 
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        // This catch block was sending the 500 error because 'User' was undefined
        res.status(500).json({ message: "Server error", error: error.message });
    }
};