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
    isSaved: {
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
    implicitScore: {
        type: Number,
        default: 0
    },
    source: {
        type: String,
        enum: ["search", "recommendation", "browse", "shared", "unknown"],
        default: "unknown"
    }
}, {
    collection: "User_Trail_Interactions",
    timestamps: true
});

UserTrailInteractionSchema.index({ userId: 1, trailId: 1 }, { unique: true });
UserTrailInteractionSchema.index({ userId: 1, isSaved: 1 });
UserTrailInteractionSchema.index({ userId: 1, isCompleted: 1 });
UserTrailInteractionSchema.index({ trailId: 1 });

const interactionDb = mongoose.connection.useDb("auth_db");
export const UserTrailInteraction = interactionDb.model(
    "UserTrailInteraction",
    UserTrailInteractionSchema
);