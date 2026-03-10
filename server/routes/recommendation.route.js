import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
    getTrailRecommendations,
    getCompanionRecommendations
} from "../controllers/recommendation.controller.js";

const router = express.Router();

// Both require login — userId comes from JWT
router.get("/trails", verifyToken, getTrailRecommendations);
router.get("/companions", verifyToken, getCompanionRecommendations);

export default router;