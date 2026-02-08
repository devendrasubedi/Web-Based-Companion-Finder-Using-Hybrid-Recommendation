import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const { isAuthenticated, user } = useAuthStore();

    useEffect(() => {
        // Only connect if user is authenticated
        if (!isAuthenticated || !user) {
            // Disconnect if socket exists
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Create socket connection
        const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        const newSocket = io(serverUrl, {
            query: {
                userId: user._id
            },
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            setIsConnected(false);
        });

        setSocket(newSocket);

        // Cleanup on unmount or when dependencies change
        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [isAuthenticated, user]);

    const value = {
        socket,
        isConnected
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
