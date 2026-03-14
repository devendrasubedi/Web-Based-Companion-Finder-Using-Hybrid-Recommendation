import express from "express";
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendRequests,
    getFriends,
    getFriendsOfUser,
    getFriendStatus,
    getBatchFriendStatus,
    blockUser,
    unblockUser
} from "../controllers/friend.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Send friend request
router.post("/request", verifyToken, sendFriendRequest);

// Accept friend request
router.post("/accept", verifyToken, acceptFriendRequest);

// Reject friend request
router.post("/reject", verifyToken, rejectFriendRequest);

// Cancel own sent request
router.post("/cancel", verifyToken, cancelFriendRequest);

// Block / unblock
router.post("/block", verifyToken, blockUser);
router.post("/unblock", verifyToken, unblockUser);

// Remove friend
router.delete("/:friendId", verifyToken, removeFriend);

// Get friend requests (sent and received)
router.get("/requests", verifyToken, getFriendRequests);

// Get friends list (logged-in user)
router.get("/", verifyToken, getFriends);

// Get friends list of a specific user
router.get("/user/:userId", getFriendsOfUser);

// Get friend status with specific user
router.get("/status/:targetUserId", verifyToken, getFriendStatus);

// Get batch friend statuses
router.post("/status/batch", verifyToken, getBatchFriendStatus);

export default router;
