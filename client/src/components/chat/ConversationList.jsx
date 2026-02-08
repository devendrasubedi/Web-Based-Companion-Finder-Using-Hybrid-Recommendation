import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';
import useChatStore from '../../store/useChatStore';

const ConversationList = ({ onSelectConversation }) => {
    const { conversations, activeConversation, onlineUsers } = useChatStore();

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

    if (conversations.length === 0) {
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
            {conversations.map((conversation) => {
                const isActive = activeConversation?._id === conversation._id;
                const otherUser = conversation.otherParticipant;
                const isOnline = isUserOnline(otherUser._id);

                return (
                    <div
                        key={conversation._id}
                        onClick={() => onSelectConversation(conversation)}
                        className={`flex items-center gap-3 p-4 cursor-pointer border-b border-border transition-colors ${isActive
                                ? 'bg-primary/10 border-l-4 border-l-primary'
                                : 'hover:bg-muted/50'
                            }`}
                    >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-lg font-semibold text-primary">
                                    {otherUser.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            {/* Online indicator */}
                            {isOnline && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                            )}
                        </div>

                        {/* Conversation info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-foreground truncate">
                                    {otherUser.name}
                                </h3>
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
