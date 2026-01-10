import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import groupRoutes from "./routes/group.routes.js";
import schoolRoutes from "./routes/school.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import rosterRoutes from "./routes/rooster.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import lecturerRoutes from "./routes/lecturer.routes.js";

const app = express();

// Middlewares
console.log("🔧 Setting up middlewares...");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://vigilo-app.onrender.com",
      "https://vigilo-faj6.onrender.com",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Custom morgan format for better debugging
app.use(
  morgan((tokens, req, res) => {
    return [
      "📡",
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      "-",
      tokens["response-time"](req, res),
      "ms",
      tokens.res(req, res, "content-length") || "0",
      "bytes",
    ].join(" ");
  })
);

// Request tracking middleware
app.use((req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔍 [${req.requestId}] ${req.method} ${req.path}`);
  next();
});

// Routes
console.log("🛣️  Registering routes...");

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/school", schoolRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/rosters", rosterRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/lecturer", lecturerRoutes);

// Default
app.get("/", (req, res) => res.send("Vigilo API running ✅"));

// 404 handler - must come before error handler
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.status = 404;
  console.warn(`⚠️ [${req.requestId}] 404 - ${req.method} ${req.path}`);
  next(error);
});

// Global error handling middleware
app.use((err, req, res, next) => {
  const requestId = req.requestId || "unknown";
  const status = err.status || err.statusCode || 500;

  // Log detailed error information
  console.error("❌ Error occurred:");
  console.error(`   Request ID: ${requestId}`);
  console.error(`   Route: ${req.method} ${req.path}`);
  console.error(`   Status: ${status}`);
  console.error(`   Error name: ${err.name}`);
  console.error(`   Error message: ${err.message}`);

  // Log stack trace for server errors
  if (status >= 500) {
    console.error(`   Stack trace:`, err.stack);
  }

  // Log request body for debugging (excluding sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    console.error(`   Request body:`, sanitizedBody);
  }

  // Send error response
  res.status(status).json({
    error: {
      message: err.message || "Internal server error",
      status: status,
      requestId: requestId,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        name: err.name,
      }),
    },
  });
});

console.log("✅ App configuration complete");

export default app;
