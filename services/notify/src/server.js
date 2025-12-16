require("dotenv").config();
const { createApp } = require("./app");
const consumerService = require("./services/consumerService");
const logger = require("./config/logger");
const emailService = require("./services/emailService");
const rabbitmq = require("./config/rabbitmq");

/**
 * Main server class that orchestrates both HTTP server and RabbitMQ consumers
 */
class NotificationServer {
  constructor() {
    this.app = createApp();
    this.server = null;
    const config = require("./config");
    this.port = config.get("PORT");
    this.host = config.get("HOST");
    this.healthCheckInterval = null;
    this.isShuttingDown = false;
  }

  /**
   * Start the notification service
   */
  async start() {
    try {
      logger.info("Starting Notification Service...", {
        port: this.port,
        host: this.host,
        environment: process.env.NODE_ENV || "development",
      });

      // Start RabbitMQ consumers first
      await this.startConsumers();

      // Start HTTP server
      await this.startHttpServer();

      // Setup health monitoring
      this.setupHealthMonitoring();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      logger.info("Notification Service started successfully", {
        port: this.port,
        host: this.host,
        httpEndpoint: `http://${this.host}:${this.port}`,
        healthEndpoint: `http://${this.host}:${this.port}/health`,
      });
    } catch (error) {
      logger.error("Failed to start Notification Service:", error);
      await this.gracefulShutdown();
      process.exit(1);
    }
  }

  /**
   * Start RabbitMQ consumers
   */
  async startConsumers() {
    try {
      logger.info("Starting RabbitMQ consumers...");
      await consumerService.startConsumers();
      logger.info("RabbitMQ consumers started successfully");
    } catch (error) {
      logger.error("Failed to start RabbitMQ consumers:", error);
      throw error;
    }
  }

  /**
   * Start HTTP server
   */
  async startHttpServer() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, this.host, (err) => {
        if (err) {
          reject(err);
        } else {
          logger.info("HTTP server started", {
            port: this.port,
            host: this.host,
          });
          resolve();
        }
      });

      // Handle server errors
      this.server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error("HTTP server error:", error);
        }
        reject(error);
      });
    });
  }

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring() {
    const config = require("./config");
    const healthCheckInterval = config.get("HEALTH_CHECK_INTERVAL_MS");

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        if (process.env.ENABLE_HEALTH_LOGGING === "true") {
          logger.info("Health check completed", health);
        }
      } catch (error) {
        logger.error("Health check failed:", error);
      }
    }, healthCheckInterval);

    logger.info("Health monitoring started", {
      intervalMs: healthCheckInterval,
    });
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    try {
      const emailHealth = await emailService.getHealthStatus();
      const rabbitHealth = await rabbitmq.healthCheck();

      return {
        status:
          emailHealth.healthy && rabbitHealth.healthy ? "healthy" : "unhealthy",
        email: emailHealth,
        rabbitmq: rabbitHealth,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    // Handle various shutdown signals
    const signals = ["SIGTERM", "SIGINT", "SIGUSR2"];

    signals.forEach((signal) => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        this.gracefulShutdown();
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception:", error);
      this.gracefulShutdown();
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled promise rejection:", reason, { promise });
      this.gracefulShutdown();
    });
  }

  /**
   * Graceful shutdown process
   */
  async gracefulShutdown() {
    if (this.isShuttingDown) {
      logger.warn("Shutdown already in progress");
      return;
    }

    this.isShuttingDown = true;
    logger.info("Starting graceful shutdown...");

    const shutdownTimeout = 30000; // 30 seconds timeout
    const shutdownTimer = setTimeout(() => {
      logger.error("Graceful shutdown timeout, forcing exit");
      process.exit(1);
    }, shutdownTimeout);

    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        logger.info("Health monitoring stopped");
      }

      // Stop HTTP server
      if (this.server) {
        await this.stopHttpServer();
      }

      // Stop RabbitMQ consumers
      await this.stopConsumers();

      clearTimeout(shutdownTimer);
      logger.info("Graceful shutdown completed successfully");
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      logger.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  }

  /**
   * Stop HTTP server
   */
  async stopHttpServer() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      logger.info("Stopping HTTP server...");

      this.server.close((err) => {
        if (err) {
          logger.error("Error stopping HTTP server:", err);
        } else {
          logger.info("HTTP server stopped");
        }
        resolve();
      });

      // Force close after timeout
      setTimeout(() => {
        logger.warn("Force closing HTTP server");
        this.server.destroy();
        resolve();
      }, 10000); // 10 seconds timeout
    });
  }

  /**
   * Stop RabbitMQ consumers
   */
  async stopConsumers() {
    try {
      logger.info("Stopping RabbitMQ consumers...");
      await consumerService.stopConsumers();
      logger.info("RabbitMQ consumers stopped");
    } catch (error) {
      logger.error("Error stopping RabbitMQ consumers:", error);
      throw error;
    }
  }
}

// Create and start server if this file is run directly
if (require.main === module) {
  const server = new NotificationServer();
  server.start().catch((error) => {
    logger.error("Failed to start server:", error);
    process.exit(1);
  });
}

module.exports = NotificationServer;
