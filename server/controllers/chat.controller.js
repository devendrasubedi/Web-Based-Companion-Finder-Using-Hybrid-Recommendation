import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";

// Get all conversations for the logged-in user
export const getUserConversations = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware

        const conversations = await Conversation.find({
            participants: userId
        })
            .populate('participants', 'name email')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        // Format conversations with other participant info
        const formattedConversations = conversations.map(conv => {
            const otherParticipant = conv.participants.find(
                p => p._id.toString() !== userId.toString()
            );

            return {
                _id: conv._id,
                otherParticipant: {
                    _id: otherParticipant._id,
                    name: otherParticipant.name,
                    email: otherParticipant.email
                },
                lastMessage: conv.lastMessage,
                unreadCount: conv.unreadCount.get(userId.toString()) || 0,
                updatedAt: conv.updatedAt
            };
        });

        res.status(200).json({
            success: true,
            conversations: formattedConversations
        });
    } catch (error) {
        console.log("Error in getUserConversations:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get messages for a specific conversation
export const getConversationMessages = async (req, res) => {
    try {
        const userId = req.userId;
        const { conversationId } = req.params;
        const { limit = 50, before } = req.query;

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        // Build query
        const query = { conversationId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('sender', 'name email')
            .populate('receiver', 'name email');

        res.status(200).json({
            success: true,
            messages: messages.reverse() // Return in chronological order
        });
    } catch (error) {
        console.log("Error in getConversationMessages:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Create or get existing conversation with another user
export const createOrGetConversation = async (req, res) => {
    try {
        const userId = req.userId;
        const { otherUserId } = req.body;

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: "Other user ID is required"
            });
        }

        if (userId.toString() === otherUserId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Cannot create conversation with yourself"
            });
        }

        // Check if other user exists
        const otherUser = await User.findById(otherUserId);
        if (!otherUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [userId, otherUserId] }
        }).populate('participants', 'name email');

        // Create new conversation if it doesn't exist
        if (!conversation) {
            console.log('Creating new conversation between', userId, 'and', otherUserId);
            conversation = await Conversation.create({
                participants: [userId, otherUserId]
            });
            console.log('Conversation created:', conversation._id);

            // Initialize unread counts safely
            try {
                if (!conversation.unreadCount) {
                    conversation.unreadCount = new Map();
                }

                // Check if it's a Map or treat as object if Mongoose is acting up
                if (typeof conversation.unreadCount.set === 'function') {
                    conversation.unreadCount.set(userId.toString(), 0);
                    conversation.unreadCount.set(otherUserId.toString(), 0);
                } else {
                    console.log('unreadCount is not a Map, treating as object:', typeof conversation.unreadCount);
                    conversation.unreadCount = {
                        [userId.toString()]: 0,
                        [otherUserId.toString()]: 0
                    };
                }

                await conversation.save();
                console.log('Conversation saved with unread counts');
            } catch (err) {
                console.error('Error initializing unread counts:', err);
                // Continue even if this fails, we don't want to block conversation creation
            }

            conversation = await conversation.populate('participants', 'name email');
        }

        const otherParticipant = conversation.participants.find(
            p => p._id.toString() !== userId.toString()
        );

        res.status(200).json({
            success: true,
            conversation: {
                _id: conversation._id,
                otherParticipant: {
                    _id: otherParticipant?._id || otherUserId,
                    name: otherParticipant?.name || 'Unknown User',
                    email: otherParticipant?.email || ''
                },
                lastMessage: conversation.lastMessage,
                unreadCount: (conversation.unreadCount && typeof conversation.unreadCount.get === 'function')
                    ? (conversation.unreadCount.get(userId.toString()) || 0)
                    : 0,
                updatedAt: conversation.updatedAt
            }
        });
    } catch (error) {
        console.log("Error in createOrGetConversation:", error);
        console.log("Error stack:", error.stack);
        res.status(500).json({
            success: false,
            message: "Server Error: " + error.message
        });
    }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
    try {
        const userId = req.userId;
        const { conversationId } = req.params;

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        // Mark all unread messages as read
        await Message.updateMany(
            {
                conversationId,
                receiver: userId,
                isRead: false
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        // Reset unread count for this user
        conversation.unreadCount.set(userId.toString(), 0);
        await conversation.save();

        res.status(200).json({
            success: true,
            message: "Messages marked as read"
        });
    } catch (error) {
        console.log("Error in markMessagesAsRead:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Search users to start a conversation
export const searchUsers = async (req, res) => {
    try {
        const userId = req.userId;
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters"
            });
        }

        const users = await User.find({
            _id: { $ne: userId }, // Exclude current user
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        })
            .select('name email')
            .limit(10);

        res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.log("Error in searchUsers:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
