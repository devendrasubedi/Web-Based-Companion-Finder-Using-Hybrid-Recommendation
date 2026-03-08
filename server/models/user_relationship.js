import mongoose from "mongoose";

/* ══════════════════════════════════════════════════════════════
   USER RELATIONSHIP — Complete Friend / Block System

   One document per user pair. userA is always the smaller ObjectId.

   Actions:
     sendRequest(from, to)    → "pending"
     acceptRequest(me, them)  → "accepted"
     rejectRequest(me, them)  → deleted
     cancelRequest(me, them)  → deleted
     unfriend(me, them)       → deleted
     blockUser(me, them)      → "blocked" (overwrites any state)
     unblockUser(me, them)    → deleted (only blocker can)

   Profile page queries:
     getFriends(userId)
     getReceivedRequests(userId)
     getSentRequests(userId)
     getBlockedUsers(userId)
     getStatus(id1, id2)

   Python recommendation queries:
     getFriendIds(userId)   → boost trail scores if friend interacted
     getBlockedIds(userId)  → filter from companion recommendations
   ══════════════════════════════════════════════════════════════ */

const UserRelationshipSchema = new mongoose.Schema({
    userA: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userB: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "blocked"],
        required: true
    },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userAName: { type: String, default: "" },
    userBName: { type: String, default: "" }
}, {
    collection: "User_Relationships",
    timestamps: true
});

// ── Indexes ─────────────────────────────────────────────────

UserRelationshipSchema.index({ userA: 1, userB: 1 }, { unique: true });
UserRelationshipSchema.index({ userA: 1, status: 1 });
UserRelationshipSchema.index({ userB: 1, status: 1 });
UserRelationshipSchema.index({ actionBy: 1, status: 1 });

// ── Helpers ─────────────────────────────────────────────────

function pair(id1, id2) {
    return id1.toString() < id2.toString()
        ? { userA: id1, userB: id2 }
        : { userA: id2, userB: id1 };
}

function other(doc, me) {
    return doc.userA.toString() === me.toString() ? doc.userB : doc.userA;
}

function otherName(doc, me) {
    return doc.userA.toString() === me.toString() ? doc.userBName : doc.userAName;
}

// ── Actions ─────────────────────────────────────────────────

UserRelationshipSchema.statics.sendRequest = async function (fromId, toId, fromName = "", toName = "") {
    if (fromId.toString() === toId.toString()) throw new Error("Cannot send request to yourself");

    const p = pair(fromId, toId);
    const existing = await this.findOne({ userA: p.userA, userB: p.userB });

    if (existing) {
        if (existing.status === "blocked") throw new Error("Blocked");
        if (existing.status === "accepted") throw new Error("Already friends");
        if (existing.status === "pending") throw new Error("Request already pending");
    }

    return this.create({
        ...p,
        status: "pending",
        actionBy: fromId,
        userAName: p.userA.toString() === fromId.toString() ? fromName : toName,
        userBName: p.userB.toString() === fromId.toString() ? fromName : toName
    });
};

UserRelationshipSchema.statics.acceptRequest = async function (accepterId, requesterId) {
    const p = pair(accepterId, requesterId);
    const doc = await this.findOne({ userA: p.userA, userB: p.userB, status: "pending" });

    if (!doc) throw new Error("No pending request found");
    if (doc.actionBy.toString() === accepterId.toString()) throw new Error("Cannot accept your own request");

    doc.status = "accepted";
    doc.actionBy = accepterId;
    return doc.save();
};

UserRelationshipSchema.statics.rejectRequest = async function (rejecterId, requesterId) {
    const p = pair(rejecterId, requesterId);
    const result = await this.deleteOne({
        userA: p.userA, userB: p.userB,
        status: "pending",
        actionBy: { $ne: rejecterId }
    });
    if (result.deletedCount === 0) throw new Error("No pending request found");
    return result;
};

UserRelationshipSchema.statics.cancelRequest = async function (senderId, receiverId) {
    const p = pair(senderId, receiverId);
    const result = await this.deleteOne({
        userA: p.userA, userB: p.userB,
        status: "pending",
        actionBy: senderId
    });
    if (result.deletedCount === 0) throw new Error("No pending request from you found");
    return result;
};

UserRelationshipSchema.statics.unfriend = async function (userId, friendId) {
    const p = pair(userId, friendId);
    const result = await this.deleteOne({ userA: p.userA, userB: p.userB, status: "accepted" });
    if (result.deletedCount === 0) throw new Error("Not friends");
    return result;
};

UserRelationshipSchema.statics.blockUser = async function (blockerId, targetId) {
    if (blockerId.toString() === targetId.toString()) throw new Error("Cannot block yourself");
    const p = pair(blockerId, targetId);
    return this.findOneAndUpdate(
        { userA: p.userA, userB: p.userB },
        { status: "blocked", actionBy: blockerId },
        { upsert: true, new: true }
    );
};

UserRelationshipSchema.statics.unblockUser = async function (unblockerId, targetId) {
    const p = pair(unblockerId, targetId);
    const result = await this.deleteOne({
        userA: p.userA, userB: p.userB,
        status: "blocked",
        actionBy: unblockerId
    });
    if (result.deletedCount === 0) throw new Error("No block found or you are not the blocker");
    return result;
};

// ── Queries (Profile Page) ──────────────────────────────────

UserRelationshipSchema.statics.getFriends = async function (userId) {
    const docs = await this.find({
        $or: [{ userA: userId }, { userB: userId }],
        status: "accepted"
    });
    return docs.map(doc => ({
        userId: other(doc, userId),
        name: otherName(doc, userId),
        since: doc.updatedAt
    }));
};

UserRelationshipSchema.statics.getReceivedRequests = async function (userId) {
    const docs = await this.find({
        $or: [{ userA: userId }, { userB: userId }],
        status: "pending",
        actionBy: { $ne: userId }
    });
    return docs.map(doc => ({
        userId: other(doc, userId),
        name: doc.actionBy.toString() === doc.userA.toString() ? doc.userAName : doc.userBName,
        sentAt: doc.createdAt
    }));
};

UserRelationshipSchema.statics.getSentRequests = async function (userId) {
    const docs = await this.find({
        $or: [{ userA: userId }, { userB: userId }],
        status: "pending",
        actionBy: userId
    });
    return docs.map(doc => ({
        userId: other(doc, userId),
        name: otherName(doc, userId),
        sentAt: doc.createdAt
    }));
};

UserRelationshipSchema.statics.getBlockedUsers = async function (userId) {
    const docs = await this.find({ status: "blocked", actionBy: userId });
    return docs.map(doc => ({
        userId: other(doc, userId),
        name: otherName(doc, userId),
        blockedAt: doc.updatedAt
    }));
};

UserRelationshipSchema.statics.getStatus = async function (userId1, userId2) {
    const p = pair(userId1, userId2);
    const doc = await this.findOne({ userA: p.userA, userB: p.userB });
    if (!doc) return { status: "none" };
    return { status: doc.status, actionBy: doc.actionBy, since: doc.updatedAt };
};

// ── Queries (Python Recommendation Engine) ──────────────────

UserRelationshipSchema.statics.getFriendIds = async function (userId) {
    const docs = await this.find({
        $or: [{ userA: userId }, { userB: userId }],
        status: "accepted"
    });
    return docs.map(doc => other(doc, userId));
};

UserRelationshipSchema.statics.getBlockedIds = async function (userId) {
    const docs = await this.find({
        $or: [{ userA: userId }, { userB: userId }],
        status: "blocked"
    });
    return docs.map(doc => other(doc, userId));
};

// ── Export ───────────────────────────────────────────────────

const relationshipDb = mongoose.connection.useDb("auth_db");
export const UserRelationship = relationshipDb.model(
    "UserRelationship",
    UserRelationshipSchema
);