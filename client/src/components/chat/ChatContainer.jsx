import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import axios from 'axios';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useSocket } from '../../context/SocketContext';
import useChatStore from '../../store/useChatStore';
import { useAuthStore } from '../../store/authStore';

axios.defaults.withCredentials = true;

const ChatContainer = () => {
    const { socket, isConnected } = useSocket();
    const { user } = useAuthStore();
    const {
        conversations,
        activeConversation,
        messages,
        setConversations,
        setActiveConversation,
        setMessages,
        addMessage,
        updateConversation,
        setOnlineUsers,
        addOnlineUser,
        removeOnlineUser,
        setTyping,
        resetUnreadCount
    } = useChatStore();

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, []);

    // Set up socket event listeners
    useEffect(() => {
        if (!socket) return;

        // Online users
        socket.on('online_users', ({ userIds }) => {
            setOnlineUsers(userIds);
        });

        socket.on('user_online', ({ userId }) => {
            addOnlineUser(userId);
        });

        socket.on('user_offline', ({ userId }) => {
            removeOnlineUser(userId);
        });

        // New message
        socket.on('new_message', (message) => {
            addMessage(message);

            // Mark as read if conversation is active
            if (activeConversation && message.conversationId === activeConversation._id) {
                socket.emit('mark_read', { conversationId: activeConversation._id });
            }
        });

        // Conversation updated
        socket.on('conversation_updated', (updatedConv) => {
            updateConversation(updatedConv);
        });

        // Typing indicators
        socket.on('user_typing', ({ conversationId, userId, isTyping }) => {
            setTyping(conversationId, userId, isTyping);
        });

        // Cleanup
        return () => {
            socket.off('online_users');
            socket.off('user_online');
            socket.off('user_offline');
            socket.off('new_message');
            socket.off('conversation_updated');
            socket.off('user_typing');
        };
    }, [socket, activeConversation]);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/chat/conversations');
            if (response.data.success) {
                setConversations(response.data.conversations);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (conversationId) => {
        try {
            const response = await axios.get(`/api/chat/messages/${conversationId}`);
            if (response.data.success) {
                setMessages(response.data.messages);

                // Mark messages as read
                if (socket) {
                    socket.emit('mark_read', { conversationId });
                }
                resetUnreadCount(conversationId);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSelectConversation = (conversation) => {
        setActiveConversation(conversation);
        fetchMessages(conversation._id);
    };

    const handleSearchUsers = async (query) => {
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await axios.get(`/api/chat/users/search?query=${query}`);
            if (response.data.success) {
                setSearchResults(response.data.users);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const handleStartConversation = async (otherUserId) => {
        try {
            console.log('Starting conversation with user:', otherUserId);
            const response = await axios.post('/api/chat/conversations', { otherUserId });
            console.log('Conversation response:', response.data);

            if (response.data.success) {
                const newConv = response.data.conversation;

                // Check if conversation already exists in the list
                const existingConv = conversations.find(c => c._id === newConv._id);

                if (!existingConv) {
                    // Add to conversations list
                    const updatedConversations = [newConv, ...conversations];
                    setConversations(updatedConversations);
                    console.log('Added new conversation to list');
                }

                // Select the conversation (whether new or existing)
                console.log('Selecting conversation:', newConv);
                handleSelectConversation(newConv);

                // Close search
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
            console.error('Error details:', error.response?.data);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-background">
            {/* Conversations sidebar */}
            <div className="w-full md:w-96 border-r border-border flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold">Messages</h2>
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Search */}
                    {showSearch && (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    handleSearchUsers(e.target.value);
                                }}
                                placeholder="Search users..."
                                className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />

                            {/* Search results */}
                            {searchResults.length > 0 && (
                                <div className="bg-card border border-border rounded-lg max-h-48 overflow-y-auto">
                                    {searchResults.map((searchUser) => (
                                        <div
                                            key={searchUser._id}
                                            onClick={() => handleStartConversation(searchUser._id)}
                                            className="flex items-center gap-3 p-3 hover:bg-primary/10 cursor-pointer transition-colors border-b border-border last:border-b-0"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-semibold text-primary">
                                                    {searchUser.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{searchUser.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{searchUser.email}</p>
                                            </div>
                                            <div className="text-xs text-primary font-medium flex-shrink-0">
                                                Chat
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Conversation list */}
                <ConversationList onSelectConversation={handleSelectConversation} />
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
                {activeConversation ? (
                    <>
                        {/* Chat header */}
                        <div className="p-4 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-primary">
                                        {activeConversation.otherParticipant.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">{activeConversation.otherParticipant.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {isConnected ? 'Connected' : 'Connecting...'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <MessageList />

                        {/* Input */}
                        <MessageInput />
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <p className="text-lg mb-2">Select a conversation</p>
                            <p className="text-sm">or search for users to start chatting</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatContainer;
