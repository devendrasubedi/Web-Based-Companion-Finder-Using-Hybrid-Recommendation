import { userModel } from '../models/userModel.js';

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