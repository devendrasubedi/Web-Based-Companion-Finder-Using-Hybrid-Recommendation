import express from "express";
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriendRequests,
    getFriends,
    getFriendStatus
} from "../controllers/friend.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Send friend request
router.post("/request", verifyToken, sendFriendRequest);

// Accept friend request
router.post("/accept", verifyToken, acceptFriendRequest);

// Reject friend request
router.post("/reject", verifyToken, rejectFriendRequest);

// Remove friend
router.delete("/:friendId", verifyToken, removeFriend);

// Get friend requests (sent and received)
router.get("/requests", verifyToken, getFriendRequests);

// Get friends list
router.get("/", verifyToken, getFriends);

// Get friend status with specific user
router.get("/status/:targetUserId", verifyToken, getFriendStatus);

export default router;
