import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    name: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        default: ""
    },
    dob: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        default: "Not Specified"
    },
    province: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    email: { // Redundant but requested
        type: String
    },
    experienceLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'expert'],
        default: 'beginner'
    },
    availability: {
        type: String,
        default: "Flexible"
    },
    availabilityWindow: {
        startMonth: Number,
        endMonth: Number
    },
    budgetLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Very High'],
        default: 'Medium'
    },
    budget: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: "NPR"
        }
    },
    interests: {
        type: [String],
        default: []
    },
    pastHikes: [], // Allow mixed data (strings or objects)
    savedHikes: [], // Allow mixed data (strings or objects)
    friends: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        addedAt: { type: Date, default: Date.now }
    }],
    friendRequests: {
        sent: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: String,
            sentAt: { type: Date, default: Date.now }
        }],
        received: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: String,
            receivedAt: { type: Date, default: Date.now }
        }]
    },
    languagesKnown: {
        type: [String],
        default: []
    },
    clusterId: Number,
    compatibilityScore: Number

}, { timestamps: true });

const profileDb = mongoose.connection.useDb('auth_db');
export const UserProfile = profileDb.model('userprofiles', userProfileSchema);
