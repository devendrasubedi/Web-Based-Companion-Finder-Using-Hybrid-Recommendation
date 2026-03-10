import { Group } from "../models/group.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Trail } from "../models/trailModel.js";
import { User } from "../models/user.model.js";

export const createGroup = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, description, trailId, trailName, trekDate, difficulty, maxMembers, tags } = req.body;

        console.log("📝 Step 1: Received payload:", { name, description, trailId, trailName, trekDate, maxMembers, userId });

        // Validate required fields
        if (!name || !description || !trailId || !trailName || !trekDate || !maxMembers) {
            console.log("❌ Step 1: Missing required fields");
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        console.log("✅ Step 1: Validation passed");
        console.log("📝 Step 2: Creating group document...");

        // Create group with creator as first member
        const group = new Group({
            name,
            description,
            trailId,
            trailName,
            trekDate,
            difficulty: difficulty || 'Moderate',
            maxMembers,
            creator: userId,
            members: [{
                userId,
                joinedAt: new Date()
            }],
            tags: tags || []
        });

        await group.save();
        console.log("✅ Step 2: Group saved -", group._id);

        console.log("📝 Step 3: Creating conversation...");
        // Create group conversation
        const conversation = new Conversation({
            isGroup: true,
            groupName: name,
            groupAdmin: userId,
            participants: [userId]
        });

        await conversation.save();
        console.log("✅ Step 3: Conversation created -", conversation._id);

        console.log("📝 Step 4: Linking group to conversation...");
        // Link group to conversation
        group.conversationId = conversation._id;
        await group.save();
        console.log("✅ Step 4: Group linked successfully");

        console.log("📝 Step 5: Sending response...");
        res.status(201).json({
            success: true,
            message: "Group created successfully",
            group: {
                _id: group._id,
                name: group.name,
                description: group.description,
                trailName: group.trailName,
                trekDate: group.trekDate,
                difficulty: group.difficulty,
                maxMembers: group.maxMembers,
                memberCount: group.members.length,
                creator: group.creator,
                members: group.members,
                conversationId: group.conversationId,
                status: group.status,
                tags: group.tags,
                createdAt: group.createdAt
            }
        });
        console.log("✅ Step 5: Response sent");
    } catch (error) {
        console.error("❌ ERROR in createGroup:", error.message);
        console.error("Stack trace:", error.stack);
        
        res.status(500).json({
            success: false,
            message: error.message || "Server Error",
            error: error.message
        });
    }
};

// Get all groups with optional filters
export const getAllGroups = async (req, res) => {
    try {
        const { trailId, status = 'active', limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        const query = { status };

        if (trailId) {
            query.trailId = trailId;
        }

        const groups = await Group.find(query)
            .populate('creator', 'name email')
            .populate('members.userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const totalCount = await Group.countDocuments(query);

        const formattedGroups = groups.map(group => ({
            _id: group._id,
            name: group.name,
            description: group.description,
            trailName: group.trailName,
            trekDate: group.trekDate,
            difficulty: group.difficulty,
            maxMembers: group.maxMembers,
            memberCount: group.members.length,
            creator: group.creator,
            members: group.members,
            conversationId: group.conversationId,
            status: group.status,
            tags: group.tags,
            isFull: group.isFull(),
            createdAt: group.createdAt
        }));

        res.status(200).json({
            success: true,
            groups: formattedGroups,
            totalCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit)
        });
    } catch (error) {
        console.log("Error in getAllGroups:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// Search groups by trail name or group name
export const searchGroups = async (req, res) => {
    try {
        const { search, status = 'active', limit = 20, page = 1 } = req.query;

        if (!search) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const skip = (page - 1) * limit;

        const groups = await Group.find({
            $text: { $search: search },
            status
        })
            .populate('creator', 'name email')
            .populate('members.userId', 'name email')
            .sort({ score: { $meta: 'textScore' } })
            .limit(parseInt(limit))
            .skip(skip);

        const totalCount = await Group.countDocuments({
            $text: { $search: search },
            status
        });

        const formattedGroups = groups.map(group => ({
            _id: group._id,
            name: group.name,
            description: group.description,
            trailName: group.trailName,
            trekDate: group.trekDate,
            difficulty: group.difficulty,
            maxMembers: group.maxMembers,
            memberCount: group.members.length,
            creator: group.creator,
            status: group.status,
            tags: group.tags,
            isFull: group.isFull(),
            createdAt: group.createdAt
        }));

        res.status(200).json({
            success: true,
            groups: formattedGroups,
            totalCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit)
        });
    } catch (error) {
        console.log("Error in searchGroups:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// Get groups by trail ID
export const getGroupsByTrail = async (req, res) => {
    try {
        const { trailId, status = 'active' } = req.query;

        if (!trailId) {
            return res.status(400).json({
                success: false,
                message: "Trail ID is required"
            });
        }

        const groups = await Group.find({ trailId, status })
            .populate('creator', 'name email')
            .populate('members.userId', 'name email')
            .sort({ createdAt: -1 });

        const formattedGroups = groups.map(group => ({
            _id: group._id,
            name: group.name,
            description: group.description,
            trailName: group.trailName,
            trekDate: group.trekDate,
            difficulty: group.difficulty,
            maxMembers: group.maxMembers,
            memberCount: group.members.length,
            creator: group.creator,
            status: group.status,
            tags: group.tags,
            isFull: group.isFull(),
            createdAt: group.createdAt
        }));

        res.status(200).json({
            success: true,
            groups: formattedGroups
        });
    } catch (error) {
        console.log("Error in getGroupsByTrail:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// Get a single group by ID
export const getGroupById = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId)
            .populate('creator', 'name email profileImage')
            .populate('members.userId', 'name email profileImage');

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        const userId = req.userId;
        const isMember = group.isMember(userId);
        const isCreator = group.isCreator(userId);

        res.status(200).json({
            success: true,
            group: {
                _id: group._id,
                name: group.name,
                description: group.description,
                trailName: group.trailName,
                trekDate: group.trekDate,
                difficulty: group.difficulty,
                maxMembers: group.maxMembers,
                memberCount: group.members.length,
                creator: group.creator,
                members: group.members,
                conversationId: group.conversationId,
                status: group.status,
                tags: group.tags,
                isFull: group.isFull(),
                isMember,
                isCreator,
                createdAt: group.createdAt
            }
        });
    } catch (error) {
        console.log("Error in getGroupById:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// Join a group
export const joinGroup = async (req, res) => {
    try {
        const userId = req.userId;
        const { groupId } = req.params;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if user is already a member
        if (group.isMember(userId)) {
            return res.status(400).json({
                success: false,
                message: "You are already a member of this group"
            });
        }

        // Check if group is full
        if (group.isFull()) {
            return res.status(400).json({
                success: false,
                message: "Group is full"
            });
        }

        // Add user to group
        group.members.push({
            userId,
            joinedAt: new Date()
        });
        await group.save();

        // Add user to group conversation
        const conversation = await Conversation.findById(group.conversationId);
        if (conversation && !conversation.participants.includes(userId)) {
            conversation.participants.push(userId);
            await conversation.save();
        }

        // Populate for response
        await group.populate('creator', 'name email');
        await group.populate('members.userId', 'name email');

        res.status(200).json({
            success: true,
            message: "Joined group successfully",
            group: {
                _id: group._id,
                name: group.name,
                description: group.description,
                trailName: group.trailName,
                trekDate: group.trekDate,
                difficulty: group.difficulty,
                maxMembers: group.maxMembers,
                memberCount: group.members.length,
                creator: group.creator,
                members: group.members,
                conversationId: group.conversationId,
                status: group.status,
                tags: group.tags,
                createdAt: group.createdAt
            }
        });
    } catch (error) {
        console.log("Error in joinGroup:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// Leave a group
export const leaveGroup = async (req, res) => {
    try {
        const userId = req.userId;
        const { groupId } = req.params;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if user is a member
        if (!group.isMember(userId)) {
            return res.status(400).json({
                success: false,
                message: "You are not a member of this group"
            });
        }

        // Cannot leave if creator (unless group is empty)
        if (group.isCreator(userId) && group.members.length > 1) {
            return res.status(400).json({
                success: false,
                message: "Creator cannot leave the group unless all members leave"
            });
        }

        // Remove user from group
        group.members = group.members.filter(m => m.userId.toString() !== userId.toString());
        await group.save();

        // Remove user from group conversation
        const conversation = await Conversation.findById(group.conversationId);
        if (conversation) {
            conversation.participants = conversation.participants.filter(p => p.toString() !== userId.toString());
            await conversation.save();
        }

        res.status(200).json({
            success: true,
            message: "Left group successfully"
        });
    } catch (error) {
        console.log("Error in leaveGroup:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// Get groups the current user is part of
export const getUserGroups = async (req, res) => {
    try {
        const userId = req.userId;
        const { status = 'active' } = req.query;

        const groups = await Group.find({
            'members.userId': userId,
            status
        })
            .populate('creator', 'name email')
            .populate('members.userId', 'name email')
            .sort({ createdAt: -1 });

        const formattedGroups = groups.map(group => ({
            _id: group._id,
            name: group.name,
            description: group.description,
            trailName: group.trailName,
            trekDate: group.trekDate,
            difficulty: group.difficulty,
            maxMembers: group.maxMembers,
            memberCount: group.members.length,
            creator: group.creator,
            status: group.status,
            tags: group.tags,
            isFull: group.isFull(),
            isCreator: group.isCreator(userId),
            conversationId: group.conversationId,
            createdAt: group.createdAt
        }));

        res.status(200).json({
            success: true,
            groups: formattedGroups
        });
    } catch (error) {
        console.log("Error in getUserGroups:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// Delete a group (creator only)
export const deleteGroup = async (req, res) => {
    try {
        const userId = req.userId;
        const { groupId } = req.params;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if user is creator
        if (!group.isCreator(userId)) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to delete this group"
            });
        }

        // Delete group conversation
        await Conversation.findByIdAndDelete(group.conversationId);

        // Delete group
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({
            success: true,
            message: "Group deleted successfully"
        });
    } catch (error) {
        console.log("Error in deleteGroup:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};
