import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';
import useChatStore from '../../store/useChatStore';

const ConversationList = ({ onSelectConversation, friends = [] }) => {
    const { conversations, activeConversation, onlineUsers } = useChatStore();

    // Merge conversations and friends
    const mergedConversations = React.useMemo(() => {
        // Start with existing conversations
        const allItems = [...conversations];

        // Add friends who don't have a conversation yet
        friends.forEach(friend => {
            const hasConversation = conversations.some(conv =>
                !conv.isGroup && (conv.otherParticipant?._id === friend.userId || conv.otherParticipant === friend.userId)
            );

            if (!hasConversation) {
                // Create a "dummy" conversation object for the friend
                allItems.push({
                    _id: `friend_${friend.userId}`, // Temporary ID
                    isGroup: false,
                    otherParticipant: {
                        _id: friend.userId,
                        name: friend.name,
                        email: friend.email, // If available
                        profilePicture: friend.profilePicture // If available
                    },
                    updatedAt: friend.addedAt || new Date(), // Use added date or now
                    lastMessage: {
                        content: 'Start a conversation',
                        sender: null
                    },
                    unreadCount: 0,
                    isFriend: true // Flag to identify pure friend entries
                });
            }
        });

        // Sort by update time (recent first)
        return allItems.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }, [conversations, friends]);

    const isUserOnline = (userId) => {
        return onlineUsers.includes(userId);
    };

    const formatTime = (date) => {
        if (!date) return '';
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true });
        } catch {
            return '';
        }
    };

    // Check if a user is a friend
    const isFriend = (userId) => {
        return friends.some(friend => friend.userId === userId);
    };

    if (mergedConversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                    Start chatting with other trekkers!
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {mergedConversations.map((conversation) => {
                // Handle temporary friend IDs for selection
                const isTemporaryFriend = conversation._id.startsWith('friend_');

                // If it's a temporary friend conversation, check if regular ID matches or if it matches the friend ID format
                const isActive = activeConversation?._id === conversation._id ||
                    (isTemporaryFriend && activeConversation?.otherParticipant?._id === conversation.otherParticipant._id);

                const isGroup = conversation.isGroup;
                const otherUser = isGroup ? null : conversation.otherParticipant;

                // Determine name and online status
                let displayName = '';
                let isOnline = false;
                let initial = '';
                let showFriendBadge = false;

                if (isGroup) {
                    displayName = conversation.groupName;
                    initial = displayName.charAt(0).toUpperCase();
                } else {
                    displayName = otherUser?.name || 'Unknown User';
                    initial = displayName.charAt(0).toUpperCase();
                    isOnline = otherUser ? isUserOnline(otherUser._id) : false;
                    // Check if friend (either via badge logic or explicit flag)
                    showFriendBadge = conversation.isFriend || (otherUser ? isFriend(otherUser._id) : false);
                }

                // Handle click: if it's a "friend-only" item, we need to handle it carefully
                // The parent's handleStartConversation usually takes a userId for new chats
                // or a conversation object for existing ones.
                // We'll pass the conversation object, but ensure parent can handle it.
                // Actually, ChatContainer's handleSelectConversation expects a conversation object.
                // For new friends, we might need to trigger handleStartConversation(userId) instead if actual conv doesn't exist.
                // But let's see how onSelectConversation is implemented. 
                // It likely sets activeConversation. 
                // If we pass this "dummy" conversation, the MessageArea needs to handle it or create a real one.
                // Better approach: If it's a temporary friend item, call a specific handler or pass formatted data.

                const handleClick = () => {
                    if (isTemporaryFriend) {
                        // It's a friend without a real conversation yet
                        // effectively same as "start conversation" with this user
                        // We can modify the onSelectConversation to handle this or 
                        // we can check if the parent passed a dedicated handler.
                        // Ideally, we just call the prop, but ensure the parent knows what to do.
                        // The parent passed `handleSelectConversation`.
                        // Let's modify the parent to handle this new object structure or
                        // pass a custom handler for friends.
                        // Actually, if we pass this object, `activeConversation` becomes this object.
                        // `MessageInput` and `MessageArea` rely on `activeConversation._id` for fetching messages.
                        // If `_id` is "friend_...", fetching messages will fail.

                        // FIX: We should treat this click as "Start Conversation" with userId.
                        // But `ConversationList` doesn't have `handleStartConversation`.
                        // We can receive it as a prop? Or we can just use `onSelectConversation` 
                        // and let the parent decide.

                        onSelectConversation({
                            ...conversation,
                            // If we pass this, the parent might try to fetch messages for "friend_123".
                            // We need to signal that this is a "new" conversation.
                            mock: true
                        });
                    } else {
                        onSelectConversation(conversation);
                    }
                };

                return (
                    <div
                        key={conversation._id}
                        onClick={handleClick}
                        className={`flex items-center gap-3 p-4 cursor-pointer border-b border-border transition-colors ${isActive
                            ? 'bg-primary/10 border-l-4 border-l-primary'
                            : 'hover:bg-muted/50'
                            }`}
                    >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-primary/20 text-primary'}`}>
                                <span className="text-lg font-semibold">
                                    {isGroup ? <User className="w-6 h-6" /> : initial}
                                </span>
                            </div>
                            {/* Online indicator - only for 1-on-1 */}
                            {!isGroup && isOnline && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                            )}
                        </div>

                        {/* Conversation info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="font-semibold text-foreground truncate">
                                        {displayName}
                                    </h3>
                                    {showFriendBadge && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                            Friend
                                        </span>
                                    )}
                                </div>
                                {conversation.lastMessage && (
                                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                        {formatTime(conversation.updatedAt)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground truncate">
                                    {conversation.lastMessage?.content || 'Start a conversation'}
                                </p>
                                {conversation.unreadCount > 0 && (
                                    <span className="ml-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                                        {conversation.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ConversationList;
