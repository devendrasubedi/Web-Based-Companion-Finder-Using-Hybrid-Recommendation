import { create } from "zustand";

export const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    error: null,
    isLoading: false,
    isCheckingAuth: true,

    signup: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
            // Mock signup
            console.log("Signup", email, password, name);
            set({ user: { email, name }, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({ error: error.message || "Error signing up", isLoading: false });
            throw error;
        }
    },

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            // Mock login
            console.log("Login", email, password);
            set({ user: { email }, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({ error: error.message || "Error logging in", isLoading: false });
            throw error;
        }
    },

    verifyEmail: async (code) => {
        set({ isLoading: true, error: null });
        try {
            // Mock verify
            console.log("Verify", code);
            set({ user: { ...useAuthStore.getState().user, isVerified: true }, isLoading: false });
        } catch (error) {
            set({ error: error.message || "Error verifying email", isLoading: false });
            throw error;
        }
    },

    checkAuth: async () => {
        set({ isCheckingAuth: true, error: null });
        try {
            // Mock check auth
            set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        } catch (error) {
            set({ error: null, isCheckingAuth: false, isAuthenticated: false });
        }
    },

    logout: async () => {
        set({ isLoading: true, error: null });
        try {
            set({ user: null, isAuthenticated: false, error: null, isLoading: false });
        } catch (error) {
            set({ error: "Error logging out", isLoading: false });
            throw error;
        }
    },
}));
