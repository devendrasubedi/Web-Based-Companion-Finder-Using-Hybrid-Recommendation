import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
    getUserConversations,
    getConversationMessages,
    createOrGetConversation,
    markMessagesAsRead,
    searchUsers,
    createGroupChat,
    addGroupParticipants
} from "../controllers/chat.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all conversations for the logged-in user
router.get("/conversations", getUserConversations);

// Get messages for a specific conversation
router.get("/messages/:conversationId", getConversationMessages);

// Create or get conversation with another user
router.post("/conversations", createOrGetConversation);

// Create a group chat
router.post("/group", createGroupChat);

// Add participants to a group
router.put("/group/add", addGroupParticipants);

// Mark messages as read in a conversation
router.put("/conversations/:conversationId/read", markMessagesAsRead);

// Search users to start a conversation
router.get("/users/search", searchUsers);

export default router;
