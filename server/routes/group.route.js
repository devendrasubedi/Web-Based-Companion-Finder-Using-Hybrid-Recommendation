import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
    createGroup,
    getAllGroups,
    searchGroups,
    getGroupsByTrail,
    getGroupById,
    joinGroup,
    leaveGroup,
    getUserGroups,
    deleteGroup
} from "../controllers/group.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create a new group
router.post("/", createGroup);

// Get all groups with optional filters
router.get("/", getAllGroups);

// Search groups
router.get("/search", searchGroups);

// Get groups by trail
router.get("/trail", getGroupsByTrail);

// Get user's groups
router.get("/user/my-groups", getUserGroups);

// Get a specific group
router.get("/:groupId", getGroupById);

// Join a group
router.post("/:groupId/join", joinGroup);

// Leave a group
router.post("/:groupId/leave", leaveGroup);

// Delete a group (creator only)
router.delete("/:groupId", deleteGroup);

export default router;
