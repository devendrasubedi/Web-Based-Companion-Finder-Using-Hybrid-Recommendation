import axios from "axios";

const PYTHON_API = process.env.RECOMMENDATION_API_URL || "http://localhost:5001";

// GET /api/recommendations/trails
export const getTrailRecommendations = async (req, res) => {
    try {
        const userId = req.userId;

        const { data } = await axios.get(
            `${PYTHON_API}/api/recommend/trails/${userId}`,
            { timeout: 15000 } // 15s timeout for heavy computation
        );

        res.status(200).json({ success: true, ...data });
    } catch (error) {
        // If Python service is down, return empty gracefully
        if (error.code === "ECONNREFUSED") {
            console.error("⚠️  Recommendation service not running at", PYTHON_API);
            return res.status(200).json({
                success: false,
                message: "Recommendation service unavailable",
                recommendations: []
            });
        }
        console.error("Recommendation error:", error.message);
        res.status(500).json({ success: false, message: "Recommendation service error" });
    }
};

// GET /api/recommendations/companions
export const getCompanionRecommendations = async (req, res) => {
    try {
        const userId = req.userId;

        const { data } = await axios.get(
            `${PYTHON_API}/api/recommend/companions/${userId}`,
            { timeout: 15000 }
        );

        res.status(200).json({ success: true, ...data });
    } catch (error) {
        if (error.code === "ECONNREFUSED") {
            console.error("⚠️  Recommendation service not running at", PYTHON_API);
            return res.status(200).json({
                success: false,
                message: "Recommendation service unavailable",
                companions: []
            });
        }
        console.error("Companion recommendation error:", error.message);
        res.status(500).json({ success: false, message: "Recommendation service error" });
    }
};