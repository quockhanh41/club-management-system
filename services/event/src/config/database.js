import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import config from "./config.js";

// Use MongoDB connection string from centralized config
const MONGODB_URI = config.get("MONGODB_URI");

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Connection timeout: 5 seconds
      socketTimeoutMS: 45000, // Socket timeout: 45 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 1, // Maintain at least 1 connection
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      maxConnecting: 2, // Maximum number of connections that can be in the "connecting" state
    });
    console.log("✅ Connected to MongoDB Atlas - Event Service Database");
    console.log(
      "🔗 Database:",
      MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
    );
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    return false;
  }
};

export const disconnectFromDatabase = async () => {
  try {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error.message);
  }
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected");
});
