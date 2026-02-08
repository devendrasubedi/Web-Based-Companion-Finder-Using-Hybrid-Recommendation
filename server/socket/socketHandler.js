import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import jwt from "jsonwebtoken";

// Store online users: userId -> socketId
const onlineUsers = new Map();

// Store typing status: conversationId -> Set of userIds
const typingUsers = new Map();

export const initializeSocket = (io) => {
    // Socket.IO authentication middleware
    io.use((socket, next) => {
        try {
            let token = socket.handshake.auth.token;

            // If no token in auth, try to get from cookies
            if (!token && socket.handshake.headers.cookie) {
                const cookies = socket.handshake.headers.cookie.split(';');
                const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
                if (tokenCookie) {
                    token = tokenCookie.split('=')[1].trim();
                }
            }

            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (error) {
            console.log("Socket authentication error:", error);
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.userId;
        console.log(`✅ User connected: ${userId} (Socket: ${socket.id})`);

        // Store user's socket connection
        onlineUsers.set(userId.toString(), socket.id);

        // Broadcast online status to all users
        io.emit("user_online", { userId });

        // Send list of online users to the newly connected user
        const onlineUserIds = Array.from(onlineUsers.keys());
        socket.emit("online_users", { userIds: onlineUserIds });

        // Join user to their own room for private messages
        socket.join(userId.toString());

        // Handle sending messages
        socket.on("send_message", async (data) => {
            try {
                const { conversationId, receiverId, content } = data;

                // Validate input
                if (!conversationId || !receiverId || !content) {
                    socket.emit("error", { message: "Missing required fields" });
                    return;
                }

                // Verify conversation exists and user is a participant
                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    participants: { $all: [userId, receiverId] }
                });

                if (!conversation) {
                    socket.emit("error", { message: "Conversation not found" });
                    return;
                }

                // Create new message
                const message = await Message.create({
                    conversationId,
                    sender: userId,
                    receiver: receiverId,
                    content: content.trim()
                });

                // Populate sender and receiver info
                await message.populate('sender', 'name email');
                await message.populate('receiver', 'name email');

                // Update conversation's last message
                conversation.lastMessage = message._id;

                // Increment unread count for receiver
                const receiverUnreadCount = conversation.unreadCount.get(receiverId.toString()) || 0;
                conversation.unreadCount.set(receiverId.toString(), receiverUnreadCount + 1);

                await conversation.save();

                // Send message to both sender and receiver
                io.to(userId.toString()).emit("new_message", message);
                io.to(receiverId.toString()).emit("new_message", message);

                // Update conversation for both users
                const formattedConversation = {
                    _id: conversation._id,
                    lastMessage: message,
                    updatedAt: conversation.updatedAt
                };

                io.to(userId.toString()).emit("conversation_updated", formattedConversation);
                io.to(receiverId.toString()).emit("conversation_updated", formattedConversation);

            } catch (error) {
                console.log("Error in send_message:", error);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        // Handle typing indicator
        socket.on("typing_start", ({ conversationId, receiverId }) => {
            if (!conversationId || !receiverId) return;

            // Add user to typing set for this conversation
            if (!typingUsers.has(conversationId)) {
                typingUsers.set(conversationId, new Set());
            }
            typingUsers.get(conversationId).add(userId.toString());

            // Notify the receiver
            io.to(receiverId.toString()).emit("user_typing", {
                conversationId,
                userId,
                isTyping: true
            });
        });

        socket.on("typing_stop", ({ conversationId, receiverId }) => {
            if (!conversationId || !receiverId) return;

            // Remove user from typing set
            if (typingUsers.has(conversationId)) {
                typingUsers.get(conversationId).delete(userId.toString());

                // Clean up empty sets
                if (typingUsers.get(conversationId).size === 0) {
                    typingUsers.delete(conversationId);
                }
            }

            // Notify the receiver
            io.to(receiverId.toString()).emit("user_typing", {
                conversationId,
                userId,
                isTyping: false
            });
        });

        // Handle marking messages as read
        socket.on("mark_read", async ({ conversationId }) => {
            try {
                if (!conversationId) return;

                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    participants: userId
                });

                if (!conversation) return;

                // Mark messages as read
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

                // Reset unread count
                conversation.unreadCount.set(userId.toString(), 0);
                await conversation.save();

                // Notify the sender that messages were read
                const otherParticipant = conversation.participants.find(
                    id => id.toString() !== userId.toString()
                );

                io.to(otherParticipant.toString()).emit("messages_read", {
                    conversationId,
                    readBy: userId
                });

            } catch (error) {
                console.log("Error in mark_read:", error);
            }
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${userId} (Socket: ${socket.id})`);

            // Remove user from online users
            onlineUsers.delete(userId.toString());

            // Clean up typing status
            typingUsers.forEach((users, conversationId) => {
                users.delete(userId.toString());
                if (users.size === 0) {
                    typingUsers.delete(conversationId);
                }
            });

            // Broadcast offline status
            io.emit("user_offline", { userId });
        });
    });

    return io;
};

// Helper function to get online users (can be used by other modules)
export const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};

export const isUserOnline = (userId) => {
    return onlineUsers.has(userId.toString());
};
