import express from "express";
import { getAllUsers, getUserProfile, toggleSavedHike } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

console.log('Setting up user routes - getAllUsers:', typeof getAllUsers, 'getUserProfile:', typeof getUserProfile);

// Get all users (for homepage cards)
router.get("/", getAllUsers);

// Toggle saved hike
router.post("/saved-hikes", verifyToken, toggleSavedHike);

// Get specific user profile
router.get("/:id", getUserProfile);
// Note: We might want verifyToken if profile is private, but usually profiles are public or semi-public.
// Keeping it open for now or we can add verifyToken if strictly private. 
// Given the social aspect (finding partners), likely public/protected. 
// I'll leave it open for reading for now, or maybe just verifyToken? 
// The user said "view even others", implying some access.
// Let's protect it so only logged-in users can view others?
// router.get("/:id", verifyToken, getUserProfile); 

export default router;
