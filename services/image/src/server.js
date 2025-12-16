require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const imageRoutes = require("./routes/imageRoutes");
const rabbitmqService = require("./config/rabbitmq");
const config = require("./config/index");

const app = express();
const PORT = config.get("PORT");

// Trust proxy (required for Kong)
app.set("trust proxy", true);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
          ],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "image-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/images", imageRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Server error:", error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large",
      maxSize: process.env.MAX_FILE_SIZE || "10MB",
    });
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      error: "Too many files",
      maxFiles: process.env.MAX_FILES || 10,
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🔄 SIGTERM received, shutting down gracefully...");
  await rabbitmqService.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🔄 SIGINT received, shutting down gracefully...");
  await rabbitmqService.close();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to RabbitMQ
    await rabbitmqService.connect();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Image Service running on port ${PORT}`);
      console.log(
        `📁 Upload endpoint: http://localhost:${PORT}/api/images/upload`
      );
      console.log(
        `📁 Bulk upload: http://localhost:${PORT}/api/images/upload/bulk`
      );
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
