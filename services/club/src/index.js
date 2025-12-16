// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const clubRoutes = require("./routes/clubRoutes");
const { connectToDatabase } = require("./config/database");
const imageEventConsumer = require("./services/imageEventConsumer");

// Initialize Express app
const app = express();
const config = require("./config");
const PORT = config.get("PORT");

// Middleware
app.use(bodyParser.json());

// Configure CORS to allow frontend origin
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://localhost:3000",
      "https://club-frontend-hq5d.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Accept",
      "Authorization",
      "Content-Type",
      "X-Requested-With",
      "X-API-Gateway-Secret",
    ],
  })
);

// Health check endpoint (BEFORE auth middleware to allow Docker health checks)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "club-service" });
});

// Routes (middleware is now applied per route)
app.use("/api", clubRoutes);

// Error handling middleware
const { errorHandler } = require("./middlewares/errorMiddleware");
app.use(errorHandler);

// Start the server
const start = async () => {
  try {
    // Connect to database
    const dbConnected = await connectToDatabase();

    if (
      !dbConnected &&
      process.env.NODE_ENV !== "development" &&
      process.env.MOCK_DB !== "true"
    ) {
      console.error("Could not connect to MongoDB. Exiting application.");
      process.exit(1);
    }

    // Initialize RabbitMQ image consumer
    if (process.env.RABBITMQ_URL) {
      try {
        await imageEventConsumer.connect();
        console.log("📥 Club service listening for image events");
      } catch (error) {
        console.warn(
          "⚠️ Could not connect to RabbitMQ for image events:",
          error.message
        );
      }
    }

    app.listen(PORT, () => {
      console.log(`Club service running on port ${PORT}`);
      if (!dbConnected) {
        console.warn(
          "⚠️ Running with limited functionality due to database connection issues"
        );
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
