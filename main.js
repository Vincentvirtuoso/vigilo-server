import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';

dotenv.config({ path: './.env' });

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error('❌ MONGO_URI not defined in .env');
    }

    await mongoose.connect(MONGO_URI, { dbName: 'vigilo' });
    console.log('✅ Connected to MongoDB');

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: ['http://localhost:5173', 'https://vigilo-app.onrender.com', 'https://vigilo-faj6.onrender.com'],
        credentials: true,
      },
    });

    // 🔥 Middleware: attach io to every req
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // Socket setup
    io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      socket.on('joinGroup', (groupId) => {
        socket.join(groupId);
        console.log(`👥 ${socket.id} joined group ${groupId}`);
      });

      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
      });
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
