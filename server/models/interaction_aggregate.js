import mongoose from "mongoose";

/* ==============================
   INTERACTION AGGREGATES (Single Source of Truth)
   
   WHAT IT REPLACES:
     - UserProfile.pastHikes  → query { userId, isCompleted: true }
     - UserProfile.savedHikes → query { userId, isCurrentlySaved: true }
   
   WHAT IT STORES:
     - One document per (userId, trailId) pair
     - saveCount: how many times saved (re-saves = stronger signal)
     - isCurrentlySaved: current bookmark state for UI
     - isCompleted: user finished this trek
     - completedAt: when they finished (seasonal pattern analysis)
     - rating: latest rating value (null if never rated)
     - lastInteraction: most recent event timestamp (recency decay)
     - implicitScore: precomputed weighted score for CF matrix
         Formula: save×3 + complete×5 + rating_value×1
   
   WHO READS IT:
     - Node.js → profile page on login (saved/completed/rated trails)
     - Python microservice → builds user-item matrix for collaborative filtering
   
   HOW IT'S UPDATED:
     - Node.js upserts on each interaction event
     - Recalculates implicitScore on every update
   
   PROFILE PAGE QUERIES:
     GET /api/interactions/:userId
       - { userId, isCurrentlySaved: true }   → "My Saved Trails"
       - { userId, isCompleted: true }        → "My Completed Trails"
       - { userId, rating: { $ne: null } }    → "My Rated Trails"
     Populate trail name/image by joining with Trails_metadata + Trails_Images
   
   INDEXES:
     - (userId, trailId) unique compound — one aggregate per pair
     - (userId, isCurrentlySaved) — fast saved trails query
     - (userId, isCompleted) — fast completed trails query
     - implicitScore descending — top interactions for ranking
   ============================== */
const InteractionAggregateSchema = new mongoose.Schema({
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

    saveCount: {
        type: Number,
        default: 0
    },
    isCurrentlySaved: {
        type: Boolean,
        default: false
    },

    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },

    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },

    lastInteraction: {
        type: Date,
        default: Date.now
    },
    implicitScore: {
        type: Number,
        default: 0
    }
}, {
    collection: "Interaction_Aggregates",
    timestamps: true
});

InteractionAggregateSchema.index({ userId: 1, trailId: 1 }, { unique: true });
InteractionAggregateSchema.index({ userId: 1 });
InteractionAggregateSchema.index({ trailId: 1 });
InteractionAggregateSchema.index({ userId: 1, isCurrentlySaved: 1 });
InteractionAggregateSchema.index({ userId: 1, isCompleted: 1 });
InteractionAggregateSchema.index({ implicitScore: -1 });

const aggregateDb = mongoose.connection.useDb("auth_db");
export const InteractionAggregate = aggregateDb.model(
    "InteractionAggregate",
    InteractionAggregateSchema
);