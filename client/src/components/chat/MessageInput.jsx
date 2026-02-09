import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import useChatStore from '../../store/useChatStore';

const MessageInput = () => {
    const [message, setMessage] = useState('');
    const { socket, isConnected } = useSocket();
    const { activeConversation } = useChatStore();
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    const handleTyping = () => {
        if (!socket || !activeConversation || !isConnected) return;

        // Start typing indicator
        if (!isTypingRef.current) {
            socket.emit('typing_start', {
                conversationId: activeConversation._id,
                receiverId: activeConversation.isGroup ? null : activeConversation.otherParticipant?._id
            });
            isTypingRef.current = true;
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            if (socket && activeConversation) {
                socket.emit('typing_stop', {
                    conversationId: activeConversation._id,
                    receiverId: activeConversation.isGroup ? null : activeConversation.otherParticipant?._id
                });
                isTypingRef.current = false;
            }
        }, 2000);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (!message.trim() || !socket || !activeConversation || !isConnected) {
            return;
        }

        // Stop typing indicator
        if (isTypingRef.current) {
            socket.emit('typing_stop', {
                conversationId: activeConversation._id,
                receiverId: activeConversation.isGroup ? null : activeConversation.otherParticipant?._id
            });
            isTypingRef.current = false;
        }

        // Clear timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Send message
        const messageData = {
            conversationId: activeConversation._id,
            content: message.trim()
        };

        if (!activeConversation.isGroup) {
            messageData.receiverId = activeConversation.otherParticipant?._id;
        }

        socket.emit('send_message', messageData);

        setMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    if (!activeConversation) {
        return null;
    }

    return (
        <form onSubmit={handleSendMessage} className="border-t border-border p-4">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value);
                        handleTyping();
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!isConnected}
                />
                <button
                    type="submit"
                    disabled={!message.trim() || !isConnected}
                    className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
            {!isConnected && (
                <p className="text-xs text-red-500 mt-2">Disconnected. Trying to reconnect...</p>
            )}
        </form>
    );
};

export default MessageInput;
