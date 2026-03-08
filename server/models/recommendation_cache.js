import mongoose from "mongoose";

/* ==============================
   RECOMMENDATION CACHE
   
   WHAT IT DOES:
     - Stores precomputed recommendations from Python microservice
     - Node.js reads this for instant API responses (no recomputation)
   
   WHAT IT STORES:
     - type: "trails" or "companions" — two separate caches per user
     - recommendations[]: ranked list of up to 50 items
       - itemId: trail _id (String) or companion userId (as String)
       - score: hybrid score (0-1 normalized) for ranking
       - reason: human-readable explanation for "Why this?" UI feature
     - generatedAt: when Python computed this batch
     - expiresAt: TTL — MongoDB auto-deletes stale documents
     - modelVersion: which model version produced this (A/B testing)
   
   WHO WRITES:
     - Python microservice (periodic cron, e.g., every 6 hours)
     - Upserts on (userId, type) compound key
   
   WHO READS:
     - Node.js API → serves to frontend instantly
   
   INDEXES:
     - (userId, type) unique compound — one cache per recommendation type
     - expiresAt TTL — auto-cleanup of stale entries
   ============================== */
const RecommendationItemSchema = new mongoose.Schema({
    itemId: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        default: ""
    }
}, { _id: false });

const RecommendationCacheSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["trails", "companions"],
        required: true
    },
    recommendations: {
        type: [RecommendationItemSchema],
        default: [],
        validate: {
            validator: (arr) => arr.length <= 50,
            message: "Recommendations list cannot exceed 50 items"
        }
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    modelVersion: {
        type: String,
        default: "v1.0"
    }
}, {
    collection: "Recommendation_Cache",
    timestamps: true
});

RecommendationCacheSchema.index({ userId: 1, type: 1 }, { unique: true });
RecommendationCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const cacheDb = mongoose.connection.useDb("auth_db");
export const RecommendationCache = cacheDb.model(
    "RecommendationCache",
    RecommendationCacheSchema
);