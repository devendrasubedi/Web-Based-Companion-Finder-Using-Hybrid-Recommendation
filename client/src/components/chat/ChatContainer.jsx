import React, { useEffect, useState } from 'react';
import { Search, X, Plus, User, UserPlus } from 'lucide-react';
import axios from 'axios';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import CreateGroupModal from './CreateGroupModal';
import AddMemberModal from './AddMemberModal';
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
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);

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

    const handleCreateGroup = async (name, participantIds) => {
        try {
            const response = await axios.post('/api/chat/group', {
                name,
                participants: participantIds
            });

            if (response.data.success) {
                const newConv = response.data.conversation;

                // Add to conversations list
                const updatedConversations = [newConv, ...conversations];
                setConversations(updatedConversations);

                // Select the new conversation
                handleSelectConversation(newConv);

                // Close modal
                setShowCreateGroup(false);
            }
        } catch (error) {
            console.error('Error creating group:', error);
        }
    };

    const handleAddMember = async (participantIds) => {
        if (!activeConversation) return;

        try {
            const response = await axios.put('/api/chat/group/add', {
                conversationId: activeConversation._id,
                participants: participantIds
            });

            if (response.data.success) {
                const updatedConv = response.data.conversation;
                updateConversation(updatedConv);
                // Also update active conversation if it matches
                if (activeConversation._id === updatedConv._id) {
                    setActiveConversation(updatedConv);
                }
                setShowAddMember(false);
            }
        } catch (error) {
            console.error('Error adding members:', error);
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
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCreateGroup(true)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                title="Create Group"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowSearch(!showSearch)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                title="Search Users"
                            >
                                {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                            </button>
                        </div>
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
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeConversation.isGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-primary/20 text-primary'}`}>
                                        <span className="text-sm font-semibold">
                                            {activeConversation.isGroup
                                                ? <User className="w-5 h-5" />
                                                : activeConversation.otherParticipant.name.charAt(0).toUpperCase()
                                            }
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">
                                            {activeConversation.isGroup
                                                ? activeConversation.groupName
                                                : activeConversation.otherParticipant.name
                                            }
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {activeConversation.isGroup
                                                ? `${activeConversation.participants.length} members`
                                                : (isConnected ? 'Connected' : 'Connecting...')
                                            }
                                        </p>
                                    </div>
                                </div>
                                {activeConversation.isGroup && (
                                    <button
                                        onClick={() => setShowAddMember(true)}
                                        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                                        title="Add Members"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                    </button>
                                )}
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

            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onCreateGroup={handleCreateGroup}
                />
            )}

            {showAddMember && activeConversation && (
                <AddMemberModal
                    onClose={() => setShowAddMember(false)}
                    onAddMember={handleAddMember}
                    conversationId={activeConversation._id}
                    currentParticipants={activeConversation.participants || []}
                />
            )}
        </div>
    );
};

export default ChatContainer;
