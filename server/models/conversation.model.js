import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    participants: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        validate: [
            {
                validator: function (val) {
                    return val && val.length === 2;
                },
                message: 'A conversation must have exactly 2 participants'
            }
        ]
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
conversationSchema.methods.getOtherParticipant = function (userId) {
    return this.participants.find(id => id.toString() !== userId.toString());
};

export const Conversation = mongoose.model('Conversation', conversationSchema);
