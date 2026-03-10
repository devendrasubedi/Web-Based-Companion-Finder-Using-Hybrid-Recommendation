import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    trailId: {
        type: String,
        ref: 'Trail',
        required: true
    },
    trailName: {
        type: String,
        required: true
    },
    trekDate: {
        type: Date,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Easy to Moderate', 'Moderate', 'Challenging', 'Difficult', 'Very Difficult'],
        default: 'Moderate'
    },
    maxMembers: {
        type: Number,
        required: true,
        min: 2,
        max: 100
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation'
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    tags: [{
        type: String,
        trim: true
    }],
    image: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
    return this.members.length;
});

// Check if user is a member
groupSchema.methods.isMember = function(userId) {
    return this.members.some(m => m.userId.toString() === userId.toString());
};

// Check if user is the creator
groupSchema.methods.isCreator = function(userId) {
    return this.creator.toString() === userId.toString();
};

// Check if group is full
groupSchema.methods.isFull = function() {
    return this.members.length >= this.maxMembers;
};

// Index for efficient queries
groupSchema.index({ trailId: 1, status: 1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ trailName: 'text', name: 'text', description: 'text' });

export const Group = mongoose.model('Group', groupSchema);
