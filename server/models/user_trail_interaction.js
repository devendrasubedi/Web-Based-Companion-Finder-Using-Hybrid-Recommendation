import mongoose from "mongoose";

/* ==============================
   USER TRAIL INTERACTION (Raw Event Log)
   
   WHAT IT DOES:
     - Logs every save/complete/rate event as individual documents
     - Time-series data — enables temporal decay (recent events weighted more)
     - source field tracks how user found the trail (measures recommendation quality)
   
   WHAT IT STORES:
     - interactionType: "save" | "complete" | "rate" (no "view")
     - rating: only populated when interactionType is "rate"
     - source: "search" | "recommendation" | "browse" | "shared" | "unknown"
     - timestamp: when the event happened
   
   WHO READS IT:
     - Python microservice for detailed temporal analysis
     - Node.js aggregation pipeline to update Interaction_Aggregates
   
   INDEXES:
     - (userId, trailId) compound — fast lookup per user per trail
     - trailId alone — build item vectors for CF
     - interactionType — filter by event type during aggregation
     - timestamp descending — recency queries
   ============================== */
const UserTrailInteractionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    trailId: {
        type: String,
        ref: "Trail",
        required: true
    },
    interactionType: {
        type: String,
        enum: ["save", "complete", "rate"],
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    source: {
        type: String,
        enum: ["search", "recommendation", "browse", "shared", "unknown"],
        default: "unknown"
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    collection: "User_Trail_Interactions",
    timestamps: true
});

UserTrailInteractionSchema.index({ userId: 1, trailId: 1 });
UserTrailInteractionSchema.index({ trailId: 1 });
UserTrailInteractionSchema.index({ interactionType: 1 });
UserTrailInteractionSchema.index({ timestamp: -1 });

const interactionDb = mongoose.connection.useDb("auth_db");
export const UserTrailInteraction = interactionDb.model(
    "UserTrailInteraction",
    UserTrailInteractionSchema
);