import express from 'express';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

import cors from "cors";

import { connectDB } from "./db/connectDB.js"
import authRoutes from './routes/auth.route.js'
import userRoutes from './routes/user.route.js'
import trailRoutes from './routes/trailRoutes.js'
import chatRoutes from './routes/chat.route.js'
import { initializeSocket } from './socket/socketHandler.js';

dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));

app.use(express.json()); //allows to parse incoming request :req.body
app.use(cookieParser()); //to parse cookies from request

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

console.log('🔧 Setting up API routes...');
app.use("/api/auth", authRoutes);
console.log('✓ Auth routes mounted at /api/auth');
app.use("/api/users", userRoutes);
console.log('✓ User routes mounted at /api/users');
app.use("/api/trails", trailRoutes);
console.log('✓ Trail routes mounted at /api/trails');
app.use("/api/chat", chatRoutes);
console.log('✓ Chat routes mounted at /api/chat');

// app.listen(PORT, () => {
//   connectDB()
//   console.log(`Example app listening on port ${PORT}`)
// })
const startServer = async () => {
  try {
    await connectDB();

    // Initialize Socket.IO
    initializeSocket(io);
    console.log('✓ Socket.IO initialized');

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`)
      console.log(`📡 Socket.IO ready for connections`)
    })
  } catch (error) {
    console.log("Failed to start server:", error)
    process.exit(1)
  }
}

startServer()