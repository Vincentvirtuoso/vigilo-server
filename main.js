import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    // Validate environment variables
    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI not defined in .env");
    }

    console.log("📡 Attempting to connect to MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: "vigilo" });
    console.log("✅ Connected to MongoDB");

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

    // Create HTTP server
    console.log("🔧 Creating HTTP server...");
    const server = http.createServer(app);

    console.log("🔧 Initializing Socket.IO...");
    const io = new Server(server, {
      cors: {
        origin: [
          "http://localhost:5173",
          "https://vigilo-app.onrender.com",
          "https://vigilo-faj6.onrender.com",
        ],
        credentials: true,
      },
    });

    // Socket.IO error handling
    io.on("connect_error", (err) => {
      console.error("❌ Socket.IO connection error:", err.message);
    });

    // Middleware: attach io to every req
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // Socket connection handling with error tracking
    io.on("connection", (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      socket.on("joinGroup", (groupId) => {
        try {
          socket.join(groupId);
          console.log(`👥 ${socket.id} joined group ${groupId}`);
        } catch (err) {
          console.error(`❌ Error joining group ${groupId}:`, err.message);
          socket.emit("error", { message: "Failed to join group" });
        }
      });

      socket.on("error", (err) => {
        console.error(`❌ Socket error for ${socket.id}:`, err.message);
      });

      socket.on("disconnect", (reason) => {
        console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);
      });
    });

    // Server error handling
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error("❌ Server error:", err.message);
      }
      process.exit(1);
    });

    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Stack trace:", err.stack);
    process.exit(1);
  }
}

// Global error handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:");
  console.error("Error name:", err.name);
  console.error("Error message:", err.message);
  console.error("Stack trace:", err.stack);
  process.exit(1);
});

startServer();
