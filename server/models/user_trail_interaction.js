import mongoose from "mongoose";

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