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
        type: String,
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
    pastHikes: [{
        name: String,
        difficulty: String,
        year: Number
    }],
    savedHikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hike' // Assuming Hike model exists or will exist
    }],
    languagesKnown: {
        type: [String],
        default: []
    },
    clusterId: Number,
    compatibilityScore: Number

}, { timestamps: true });

const profileDb = mongoose.connection.useDb('user_profile_db');
export const UserProfile = profileDb.model('UserProfile', userProfileSchema);
