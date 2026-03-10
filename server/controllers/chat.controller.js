import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { UserRelationship } from "../models/user_relationship.js";

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

        // Format conversations
        const formattedConversations = conversations.map(conv => {
            let conversationData = {
                _id: conv._id,
                isGroup: conv.isGroup || false,
                lastMessage: conv.lastMessage,
                unreadCount: conv.unreadCount.get(userId.toString()) || 0,
                updatedAt: conv.updatedAt
            };

            if (conv.isGroup) {
                conversationData.groupName = conv.groupName;
                conversationData.groupAdmin = conv.groupAdmin;
                conversationData.participants = conv.participants.map(p => ({
                    _id: p._id,
                    name: p.name,
                    email: p.email
                }));
                // For group chats, otherParticipant is not applicable in the same way, 
                // but we can set it to null or a placeholder if frontend expects it.
                // However, updated frontend should check isGroup.
            } else {
                const otherParticipant = conv.participants.find(
                    p => p._id.toString() !== userId.toString()
                );
                conversationData.otherParticipant = {
                    _id: otherParticipant?._id,
                    name: otherParticipant?.name || 'Unknown User',
                    email: otherParticipant?.email || ''
                };
            }

            return conversationData;
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



// Create a group chat
export const createGroupChat = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, participants } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Group name is required"
            });
        }

        if (!participants || !Array.isArray(participants) || participants.length < 2) {
            return res.status(400).json({
                success: false,
                message: "A group must have at least 3 participants (including you)"
            });
        }

        // Add current user to participants if not already added
        const uniqueParticipants = [...new Set([...participants, userId])];

        if (uniqueParticipants.length < 3) {
            return res.status(400).json({
                success: false,
                message: "A group must have at least 3 participants"
            });
        }

        // Verify that all participants exist
        const users = await User.find({ _id: { $in: uniqueParticipants } });
        if (users.length !== uniqueParticipants.length) {
            return res.status(400).json({
                success: false,
                message: "One or more participants not found"
            });
        }

        const conversation = await Conversation.create({
            participants: uniqueParticipants,
            isGroup: true,
            groupName: name,
            groupAdmin: userId,
            unreadCount: uniqueParticipants.reduce((acc, id) => {
                acc[id] = 0;
                return acc;
            }, {})
        });

        const populatedConversation = await Conversation.findById(conversation._id)
            .populate('participants', 'name email')
            .populate('groupAdmin', 'name email');

        res.status(201).json({
            success: true,
            conversation: {
                _id: populatedConversation._id,
                isGroup: true,
                groupName: populatedConversation.groupName,
                groupAdmin: populatedConversation.groupAdmin,
                participants: populatedConversation.participants.map(p => ({
                    _id: p._id,
                    name: p.name,
                    email: p.email
                })),
                lastMessage: null,
                unreadCount: 0,
                updatedAt: populatedConversation.updatedAt
            }
        });

    } catch (error) {
        console.log("Error in createGroupChat:", error);
        res.status(500).json({
            success: false,
            message: "Server Error: " + error.message
        });
    }
};

// Add participants to a group
export const addGroupParticipants = async (req, res) => {
    try {
        const userId = req.userId;
        const { conversationId, participants } = req.body;

        if (!conversationId || !participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Conversation ID and participants are required"
            });
        }

        // Check if conversation exists and is a group
        const conversation = await Conversation.findOne({
            _id: conversationId,
            isGroup: true,
            participants: userId // Only allow existing participants to add others
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Group not found or you are not a participant"
            });
        }

        // Verify users to add exist
        const usersToAdd = await User.find({ _id: { $in: participants } });
        if (usersToAdd.length !== participants.length) {
            return res.status(400).json({
                success: false,
                message: "One or more users to add not found"
            });
        }

        // Add users to participants list (using Set to avoid duplicates handled by addToSet in logic, but explicit check is good)
        // Mongoose addToSet will only add unique values
        const updatedConversation = await Conversation.findByIdAndUpdate(
            conversationId,
            {
                $addToSet: { participants: { $each: participants } }
            },
            { new: true }
        )
            .populate('participants', 'name email')
            .populate('groupAdmin', 'name email');

        // Initialize unread counts for new members
        // We need to do this manually because findByIdAndUpdate doesn't run pre-save hooks easily for this map logic in the same way 
        // or effectively we just want to ensure they have an entry.

        // However, updating the map via findByIdAndUpdate is tricky. Let's do it via save if needed or just specific update.
        // Easiest is to fetch, update map, save. But since we used findByIdAndUpdate above, we can just update the map now.

        let needsSave = false;
        participants.forEach(pId => {
            if (!updatedConversation.unreadCount.has(pId.toString())) {
                updatedConversation.unreadCount.set(pId.toString(), 0);
                needsSave = true;
            }
        });

        if (needsSave) {
            await updatedConversation.save();
        }

        res.status(200).json({
            success: true,
            conversation: {
                _id: updatedConversation._id,
                isGroup: true,
                groupName: updatedConversation.groupName,
                groupAdmin: updatedConversation.groupAdmin,
                participants: updatedConversation.participants.map(p => ({
                    _id: p._id,
                    name: p.name,
                    email: p.email
                })),
                lastMessage: updatedConversation.lastMessage,
                unreadCount: updatedConversation.unreadCount.get(userId.toString()) || 0,
                updatedAt: updatedConversation.updatedAt
            }
        });

    } catch (error) {
        console.log("Error in addGroupParticipants:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Search users to start a conversation (ONLY FRIENDS)
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

        // Get the list of friend IDs for the current user
        const friends = await UserRelationship.getFriends(userId);
        const friendIds = friends.map(f => f._id || f.id);

        if (friendIds.length === 0) {
            return res.status(200).json({ success: true, users: [] });
        }

        // Search only within the friend list
        const users = await User.find({
            _id: { $in: friendIds, $ne: userId }, // Exclude current user just in case
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
