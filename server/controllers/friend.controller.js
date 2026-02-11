import { UserProfile } from "../models/userProfile.model.js";
import { User } from "../models/user.model.js";

// Send friend request
export const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.userId;
        const { receiverId, receiverName } = req.body;

        if (!receiverId) {
            return res.status(400).json({ success: false, message: "Receiver ID is required" });
        }

        if (senderId === receiverId) {
            return res.status(400).json({ success: false, message: "Cannot send friend request to yourself" });
        }

        const [senderProfile, receiverProfile] = await Promise.all([
            UserProfile.findOne({ userId: senderId }),
            UserProfile.findOne({ userId: receiverId })
        ]);

        if (!senderProfile || !receiverProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Check if already friends
        const alreadyFriends = senderProfile.friends?.some(f => f.userId.toString() === receiverId);
        if (alreadyFriends) {
            return res.status(400).json({ success: false, message: "Already friends" });
        }

        // Check if request already sent
        const requestAlreadySent = senderProfile.friendRequests?.sent?.some(r => r.userId.toString() === receiverId);
        if (requestAlreadySent) {
            return res.status(400).json({ success: false, message: "Friend request already sent" });
        }

        // Check if request already received from this user
        const requestAlreadyReceived = senderProfile.friendRequests?.received?.some(r => r.userId.toString() === receiverId);
        if (requestAlreadyReceived) {
            return res.status(400).json({ success: false, message: "This user has already sent you a friend request" });
        }

        // Get sender name
        const sender = await User.findById(senderId);
        const senderName = sender?.name || "Unknown User";

        // Initialize friendRequests if not exists
        if (!senderProfile.friendRequests) {
            senderProfile.friendRequests = { sent: [], received: [] };
        }
        if (!receiverProfile.friendRequests) {
            receiverProfile.friendRequests = { sent: [], received: [] };
        }

        // Add to sender's sent requests
        senderProfile.friendRequests.sent.push({
            userId: receiverId,
            name: receiverName || "Unknown User",
            sentAt: new Date()
        });

        // Add to receiver's received requests
        receiverProfile.friendRequests.received.push({
            userId: senderId,
            name: senderName,
            receivedAt: new Date()
        });

        await Promise.all([senderProfile.save(), receiverProfile.save()]);

        res.status(200).json({
            success: true,
            message: "Friend request sent successfully"
        });

    } catch (error) {
        console.log("Error in sendFriendRequest: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Accept friend request
export const acceptFriendRequest = async (req, res) => {
    try {
        const userId = req.userId;
        const { senderId, senderName } = req.body;

        if (!senderId) {
            return res.status(400).json({ success: false, message: "Sender ID is required" });
        }

        const [userProfile, senderProfile] = await Promise.all([
            UserProfile.findOne({ userId }),
            UserProfile.findOne({ userId: senderId })
        ]);

        if (!userProfile || !senderProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Get user name
        const user = await User.findById(userId);
        const userName = user?.name || "Unknown User";

        // Remove from friend requests
        userProfile.friendRequests.received = userProfile.friendRequests.received.filter(
            r => r.userId.toString() !== senderId
        );
        senderProfile.friendRequests.sent = senderProfile.friendRequests.sent.filter(
            r => r.userId.toString() !== userId
        );

        // Initialize friends array if not exists
        if (!userProfile.friends) userProfile.friends = [];
        if (!senderProfile.friends) senderProfile.friends = [];

        // Add to friends list
        userProfile.friends.push({
            userId: senderId,
            name: senderName || "Unknown User",
            addedAt: new Date()
        });

        senderProfile.friends.push({
            userId: userId,
            name: userName,
            addedAt: new Date()
        });

        await Promise.all([userProfile.save(), senderProfile.save()]);

        res.status(200).json({
            success: true,
            message: "Friend request accepted",
            friends: userProfile.friends
        });

    } catch (error) {
        console.log("Error in acceptFriendRequest: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Reject friend request
export const rejectFriendRequest = async (req, res) => {
    try {
        const userId = req.userId;
        const { senderId } = req.body;

        if (!senderId) {
            return res.status(400).json({ success: false, message: "Sender ID is required" });
        }

        const [userProfile, senderProfile] = await Promise.all([
            UserProfile.findOne({ userId }),
            UserProfile.findOne({ userId: senderId })
        ]);

        if (!userProfile || !senderProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Remove from friend requests
        userProfile.friendRequests.received = userProfile.friendRequests.received.filter(
            r => r.userId.toString() !== senderId
        );
        senderProfile.friendRequests.sent = senderProfile.friendRequests.sent.filter(
            r => r.userId.toString() !== userId
        );

        await Promise.all([userProfile.save(), senderProfile.save()]);

        res.status(200).json({
            success: true,
            message: "Friend request rejected"
        });

    } catch (error) {
        console.log("Error in rejectFriendRequest: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Remove friend
export const removeFriend = async (req, res) => {
    try {
        const userId = req.userId;
        const { friendId } = req.params;

        if (!friendId) {
            return res.status(400).json({ success: false, message: "Friend ID is required" });
        }

        const [userProfile, friendProfile] = await Promise.all([
            UserProfile.findOne({ userId }),
            UserProfile.findOne({ userId: friendId })
        ]);

        if (!userProfile || !friendProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Remove from both friends lists
        userProfile.friends = userProfile.friends.filter(
            f => f.userId.toString() !== friendId
        );
        friendProfile.friends = friendProfile.friends.filter(
            f => f.userId.toString() !== userId
        );

        await Promise.all([userProfile.save(), friendProfile.save()]);

        res.status(200).json({
            success: true,
            message: "Friend removed successfully",
            friends: userProfile.friends
        });

    } catch (error) {
        console.log("Error in removeFriend: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get friend requests
export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.userId;

        const userProfile = await UserProfile.findOne({ userId });

        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        res.status(200).json({
            success: true,
            sent: userProfile.friendRequests?.sent || [],
            received: userProfile.friendRequests?.received || []
        });

    } catch (error) {
        console.log("Error in getFriendRequests: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get friends list
export const getFriends = async (req, res) => {
    try {
        const userId = req.userId;

        const userProfile = await UserProfile.findOne({ userId });

        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        res.status(200).json({
            success: true,
            friends: userProfile.friends || []
        });

    } catch (error) {
        console.log("Error in getFriends: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get friend status with a specific user
export const getFriendStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { targetUserId } = req.params;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "Target user ID is required" });
        }

        const userProfile = await UserProfile.findOne({ userId });

        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Check if friends
        const isFriend = userProfile.friends?.some(f => f.userId.toString() === targetUserId);
        if (isFriend) {
            return res.status(200).json({ success: true, status: "friends" });
        }

        // Check if request sent
        const requestSent = userProfile.friendRequests?.sent?.some(r => r.userId.toString() === targetUserId);
        if (requestSent) {
            return res.status(200).json({ success: true, status: "request_sent" });
        }

        // Check if request received
        const requestReceived = userProfile.friendRequests?.received?.some(r => r.userId.toString() === targetUserId);
        if (requestReceived) {
            return res.status(200).json({ success: true, status: "request_received" });
        }

        res.status(200).json({ success: true, status: "none" });

    } catch (error) {
        console.log("Error in getFriendStatus: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
