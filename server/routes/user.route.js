import express from "express";
import {
    getAllUsers,
    getUserProfile,
    toggleSavedHike,
    toggleCompletedHike,
    getUserInteractions,
    getPublicUserInteractions,
    getSuggestedFriends
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Get all users (for homepage cards)
router.get("/", getAllUsers);

// Get own interactions (saved + completed hikes)
router.get("/interactions", verifyToken, getUserInteractions);

// Get suggested friends
router.get("/suggested/friends", verifyToken, getSuggestedFriends);

// Toggle saved hike
router.post("/saved-hikes", verifyToken, toggleSavedHike);

// Toggle completed hike
router.post("/completed-hikes", verifyToken, toggleCompletedHike);

// Get specific user profile (public)
router.get("/:id/interactions", getPublicUserInteractions);
router.get("/:id", getUserProfile);

export default router;
