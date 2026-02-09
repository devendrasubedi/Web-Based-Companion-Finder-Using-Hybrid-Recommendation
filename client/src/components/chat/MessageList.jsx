import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import useChatStore from '../../store/useChatStore';

const MessageList = () => {
    const { user } = useAuthStore();
    const { messages, activeConversation, typingUsers } = useChatStore();
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (date) => {
        try {
            return format(new Date(date), 'HH:mm');
        } catch {
            return '';
        }
    };

    const isTyping = activeConversation && typingUsers[activeConversation._id];

    if (!activeConversation) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a conversation to start chatting</p>
            </div>
        );
    }

    if (messages.length === 0 && !isTyping) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No messages yet. Start the conversation!</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => {
                const isSentByMe = message.sender._id === user._id;

                return (
                    <div
                        key={message._id}
                        className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${isSentByMe
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                                }`}
                        >
                            {!isSentByMe && activeConversation?.isGroup && (
                                <p className="text-xs font-semibold mb-1">
                                    {message.sender.name}
                                </p>
                            )}
                            <p className="break-words">{message.content}</p>
                            <p
                                className={`text-xs mt-1 ${isSentByMe
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                    }`}
                            >
                                {formatTime(message.createdAt)}
                            </p>
                        </div>
                    </div>
                );
            })}

            {/* Typing indicator */}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
