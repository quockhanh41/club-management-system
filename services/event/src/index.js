import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { eventRoutes } from "./routes/eventRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { connectToDatabase } from "./config/database.js";
import cronJobManager from "./utils/cronJobManager.js";
import imageEventConsumer from "./services/imageEventConsumer.js";

// Load environment variables
dotenv.config();

import config from "./config/config.js";

console.log("🚀 Starting Event Service...");
console.log("📁 Environment:", config.get("NODE_ENV"));
console.log("🔌 Port:", config.get("PORT"));

const app = express();
const PORT = config.get("PORT");

// Middleware
app.use(bodyParser.json());

// Health check endpoint (before other routes)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "event-service",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use(eventRoutes);
app.use(adminRoutes);

// Start server
const startServer = async () => {
  try {
    console.log("🔄 Attempting to connect to database...");
    // Connect to MongoDB
    const dbConnected = await connectToDatabase();

    console.log("📊 Database connection result:", dbConnected);

    if (!dbConnected && process.env.NODE_ENV !== "development") {
      console.error("Could not connect to MongoDB. Exiting application.");
      process.exit(1);
    }

    // Initialize RabbitMQ image consumer
    if (process.env.RABBITMQ_URL) {
      try {
        await imageEventConsumer.connect();
        console.log("📥 Event service listening for image events");
      } catch (error) {
        console.warn(
          "⚠️ Could not connect to RabbitMQ for image events:",
          error.message
        );
      }
    }

    app.listen(PORT, () => {
      console.log(`🚀 Event service running on http://localhost:${PORT}`);
      if (!dbConnected) {
        console.warn(
          "⚠️ Running with limited functionality due to database connection issues"
        );
      } else {
        // Start cron jobs only if database is connected
        console.log("🔄 Starting cron jobs...");
        cronJobManager.startJobs();
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("📞 SIGTERM received, shutting down gracefully");
  cronJobManager.stopJobs();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📞 SIGINT received, shutting down gracefully");
  cronJobManager.stopJobs();
  process.exit(0);
});

startServer();
