import { UserRelationship } from "../models/user_relationship.js";
import { UserProfile } from "../models/userProfile.model.js";
import { User } from "../models/user.model.js";

// Helper: get display name for a userId
async function getDisplayName(userId) {
    const profile = await UserProfile.findOne({ userId }).select("name").lean();
    if (profile?.name) return profile.name;
    const user = await User.findById(userId).select("name").lean();
    return user?.name || "Unknown User";
}

// POST /api/friends/request
export const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.userId;
        const { receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({ success: false, message: "Receiver ID is required" });
        }

        const [senderName, receiverName] = await Promise.all([
            getDisplayName(senderId),
            getDisplayName(receiverId)
        ]);

        const newRequest = await UserRelationship.sendRequest(senderId, receiverId, senderName, receiverName);

        // Emit socket event to the receiver
        const io = req.app.get("io");
        if (io) {
            io.to(receiverId.toString()).emit("new_friend_request", {
                senderId,
                senderName,
                timestamp: new Date()
            });
        }

        res.status(200).json({ success: true, message: "Friend request sent successfully" });
    } catch (error) {
        const msg = error.message;
        if (["Already friends", "Request already pending", "Blocked"].includes(msg)) {
            return res.status(400).json({ success: false, message: msg });
        }
        console.error("Error in sendFriendRequest:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// POST /api/friends/accept
export const acceptFriendRequest = async (req, res) => {
    try {
        const accepterId = req.userId;
        const { senderId } = req.body;

        if (!senderId) {
            return res.status(400).json({ success: false, message: "Sender ID is required" });
        }

        await UserRelationship.acceptRequest(accepterId, senderId);

        // Return the updated friends list
        const friends = await UserRelationship.getFriends(accepterId);

        res.status(200).json({ success: true, message: "Friend request accepted", friends });
    } catch (error) {
        const msg = error.message;
        if (["No pending request found", "Cannot accept your own request"].includes(msg)) {
            return res.status(400).json({ success: false, message: msg });
        }
        console.error("Error in acceptFriendRequest:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// POST /api/friends/reject
export const rejectFriendRequest = async (req, res) => {
    try {
        const rejecterId = req.userId;
        const { senderId } = req.body;

        if (!senderId) {
            return res.status(400).json({ success: false, message: "Sender ID is required" });
        }

        await UserRelationship.rejectRequest(rejecterId, senderId);

        res.status(200).json({ success: true, message: "Friend request rejected" });
    } catch (error) {
        const msg = error.message;
        if (msg === "No pending request found") {
            return res.status(400).json({ success: false, message: msg });
        }
        console.error("Error in rejectFriendRequest:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// POST /api/friends/cancel
export const cancelFriendRequest = async (req, res) => {
    try {
        const senderId = req.userId;
        const { receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({ success: false, message: "Receiver ID is required" });
        }

        await UserRelationship.cancelRequest(senderId, receiverId);

        res.status(200).json({ success: true, message: "Friend request cancelled" });
    } catch (error) {
        const msg = error.message;
        if (msg === "No pending request from you found") {
            return res.status(400).json({ success: false, message: msg });
        }
        console.error("Error in cancelFriendRequest:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// DELETE /api/friends/:friendId
export const removeFriend = async (req, res) => {
    try {
        const userId = req.userId;
        const { friendId } = req.params;

        if (!friendId) {
            return res.status(400).json({ success: false, message: "Friend ID is required" });
        }

        await UserRelationship.unfriend(userId, friendId);

        const friends = await UserRelationship.getFriends(userId);

        res.status(200).json({ success: true, message: "Friend removed successfully", friends });
    } catch (error) {
        const msg = error.message;
        if (msg === "Not friends") {
            return res.status(400).json({ success: false, message: msg });
        }
        console.error("Error in removeFriend:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET /api/friends/requests
export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.userId;

        const [received, sent] = await Promise.all([
            UserRelationship.getReceivedRequests(userId),
            UserRelationship.getSentRequests(userId)
        ]);

        res.status(200).json({ success: true, received, sent });
    } catch (error) {
        console.error("Error in getFriendRequests:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET /api/friends/
export const getFriends = async (req, res) => {
    try {
        const userId = req.userId;
        const friends = await UserRelationship.getFriends(userId);

        // Enrich with province info for display
        const enriched = await Promise.all(friends.map(async (f) => {
            const profile = await UserProfile.findOne({ userId: f.userId }).select("province").lean();
            return { ...f, province: profile?.province || "" };
        }));

        res.status(200).json({ success: true, friends: enriched });
    } catch (error) {
        console.error("Error in getFriends:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET /api/friends/user/:userId
export const getFriendsOfUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const friends = await UserRelationship.getFriends(userId);

        // Enrich with province info for display
        const enriched = await Promise.all(friends.map(async (f) => {
            const profile = await UserProfile.findOne({ userId: f.userId }).select("province").lean();
            return { ...f, province: profile?.province || "" };
        }));

        res.status(200).json({ success: true, friends: enriched });
    } catch (error) {
        console.error("Error in getFriendsOfUser:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET /api/friends/status/:targetUserId
export const getFriendStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { targetUserId } = req.params;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "Target user ID is required" });
        }

        const result = await UserRelationship.getStatus(userId, targetUserId);

        // Translate to front-end status strings
        let status = "none";
        if (result.status === "accepted") {
            status = "friends";
        } else if (result.status === "pending") {
            // Who sent the request?
            status = result.actionBy?.toString() === userId?.toString()
                ? "request_sent"
                : "request_received";
        } else if (result.status === "blocked") {
            status = "blocked";
        }

        res.status(200).json({ success: true, status, actionBy: result.actionBy, since: result.since });
    } catch (error) {
        console.error("Error in getFriendStatus:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// POST /api/friends/status/batch
export const getBatchFriendStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { targetUserIds } = req.body;

        if (!Array.isArray(targetUserIds)) {
            return res.status(400).json({ success: false, message: "targetUserIds must be an array" });
        }

        const statuses = {};
        await Promise.all(targetUserIds.map(async (targetUserId) => {
            const result = await UserRelationship.getStatus(userId, targetUserId);
            
            let status = "none";
            if (result.status === "accepted") {
                status = "friends";
            } else if (result.status === "pending") {
                status = result.actionBy?.toString() === userId?.toString()
                    ? "request_sent"
                    : "request_received";
            } else if (result.status === "blocked") {
                status = "blocked";
            }
            statuses[targetUserId] = status;
        }));

        res.status(200).json({ success: true, statuses });
    } catch (error) {
        console.error("Error in getBatchFriendStatus:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// POST /api/friends/block
export const blockUser = async (req, res) => {
    try {
        const blockerId = req.userId;
        const { targetId } = req.body;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "Target ID is required" });
        }

        await UserRelationship.blockUser(blockerId, targetId);
        res.status(200).json({ success: true, message: "User blocked" });
    } catch (error) {
        console.error("Error in blockUser:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// POST /api/friends/unblock
export const unblockUser = async (req, res) => {
    try {
        const unblockerId = req.userId;
        const { targetId } = req.body;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "Target ID is required" });
        }

        await UserRelationship.unblockUser(unblockerId, targetId);
        res.status(200).json({ success: true, message: "User unblocked" });
    } catch (error) {
        console.error("Error in unblockUser:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
