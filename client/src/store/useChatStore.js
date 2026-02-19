import { create } from 'zustand';

const useChatStore = create((set, get) => ({
    // State
    conversations: [],
    activeConversation: null,
    messages: [],
    onlineUsers: [],
    typingUsers: {},
    loading: false,
    error: null,

    // Actions
    setConversations: (conversations) => set({ conversations }),

    setActiveConversation: (conversation) => set({
        activeConversation: conversation,
        messages: [] // Clear messages when switching conversations
    }),

    setMessages: (messages) => set({ messages }),

    addMessage: (message) => set((state) => {
        if (state.activeConversation && state.activeConversation._id === message.conversationId) {
            // Check for duplicates
            const exists = state.messages.some(m => m._id === message._id);
            if (exists) return state;
            
            return { messages: [...state.messages, message] };
        }
        return state;
    }),

    updateConversation: (updatedConversation) => set((state) => ({
        conversations: state.conversations.map(conv =>
            conv._id === updatedConversation._id
                ? { ...conv, ...updatedConversation }
                : conv
        )
    })),

    incrementUnreadCount: (conversationId) => set((state) => ({
        conversations: state.conversations.map(conv =>
            conv._id === conversationId
                ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
                : conv
        )
    })),

    resetUnreadCount: (conversationId) => set((state) => ({
        conversations: state.conversations.map(conv =>
            conv._id === conversationId
                ? { ...conv, unreadCount: 0 }
                : conv
        )
    })),

    setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

    addOnlineUser: (userId) => set((state) => ({
        onlineUsers: [...new Set([...state.onlineUsers, userId])]
    })),

    removeOnlineUser: (userId) => set((state) => ({
        onlineUsers: state.onlineUsers.filter(id => id !== userId)
    })),

    setTyping: (conversationId, userId, isTyping) => set((state) => {
        const newTypingUsers = { ...state.typingUsers };
        if (isTyping) {
            newTypingUsers[conversationId] = userId;
        } else {
            delete newTypingUsers[conversationId];
        }
        return { typingUsers: newTypingUsers };
    }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),

    reset: () => set({
        conversations: [],
        activeConversation: null,
        messages: [],
        onlineUsers: [],
        typingUsers: {},
        loading: false,
        error: null
    })
}));

export default useChatStore;
