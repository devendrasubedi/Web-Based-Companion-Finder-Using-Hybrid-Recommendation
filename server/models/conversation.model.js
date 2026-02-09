import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
        trim: true
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: () => new Map()
    }
}, {
    timestamps: true
});

// Index for efficient participant lookup
conversationSchema.index({ participants: 1 });

// Method to get the other participant
// Method to get the other participant (for 1-on-1 chats)
conversationSchema.methods.getOtherParticipant = function (userId) {
    if (this.isGroup) return null;
    return this.participants.find(id => id.toString() !== userId.toString());
};

export const Conversation = mongoose.model('Conversation', conversationSchema);
