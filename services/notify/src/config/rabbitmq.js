const amqp = require("amqplib");
const logger = require("./logger");

/**
 * RabbitMQ Configuration and Management for Notification Service
 * Handles connections, queue setup, and message consumption
 */
const config = require("./index");

class RabbitMQConfig {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.url = config.get("RABBITMQ_URL");
    this.exchange = config.get("RABBITMQ_EXCHANGE");
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds

    // Queue configurations (using underscores for queue names)
    this.queues = {
      emailVerification:
        process.env.RABBITMQ_EMAIL_VERIFICATION_QUEUE ||
        "send_email_verification",
      passwordReset:
        process.env.RABBITMQ_PASSWORD_RESET_QUEUE ||
        "send_email_password_reset",
      rsvp: process.env.RABBITMQ_RSVP_QUEUE || "send_email_rsvp",
      announcement:
        process.env.RABBITMQ_ANNOUNCEMENT_QUEUE || "send_email_announcement",
    };

    // Routing keys (using dots for routing keys)
    this.routingKeys = {
      emailVerification: "send.email.verification",
      passwordReset: "send.email.password.reset",
      rsvp: "send.email.rsvp",
      announcement: "send.email.announcement",
    };
  }

  /**
   * Connect to RabbitMQ and set up exchanges and queues
   */
  async connect() {
    try {
      if (this.isConnected) {
        return this.channel;
      }

      logger.queue("Connecting to RabbitMQ...", { url: this.url });

      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      // Set prefetch count for fair distribution
      await this.channel.prefetch(1);

      // Create exchange if it doesn't exist
      await this.channel.assertExchange(this.exchange, "topic", {
        durable: true,
      });

      // Setup all queues
      await this.setupQueues();

      // Handle connection events
      this.connection.on("close", () => {
        logger.warn("RabbitMQ connection closed");
        this.isConnected = false;
        this.reconnect();
      });

      this.connection.on("error", (err) => {
        logger.error("RabbitMQ connection error:", err);
        this.isConnected = false;
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.queue("Successfully connected to RabbitMQ");

      return this.channel;
    } catch (error) {
      logger.error("Failed to connect to RabbitMQ:", error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Setup all required queues for the notification service
   */
  async setupQueues() {
    try {
      const queueTypes = Object.keys(this.queues);

      for (const queueType of queueTypes) {
        const queueName = this.queues[queueType];
        const routingKey = this.routingKeys[queueType];

        // Assert queue
        await this.channel.assertQueue(queueName, {
          durable: true,
          arguments: {
            "x-message-ttl": 86400000, // 24 hours TTL
            "x-max-retries": 3,
          },
        });

        // Bind queue to exchange with routing key (dots for routing keys)
        await this.channel.bindQueue(queueName, this.exchange, routingKey);

        logger.queue(`Queue setup completed: ${queueName} -> ${routingKey}`, {
          queueType,
        });
      }
    } catch (error) {
      logger.error("Failed to setup queues:", error);
      throw error;
    }
  }

  /**
   * Reconnect to RabbitMQ with exponential backoff
   */
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(
        `Failed to reconnect to RabbitMQ after ${this.maxReconnectAttempts} attempts`
      );
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    logger.queue(
      `Attempting to reconnect to RabbitMQ (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      {
        delay,
      }
    );

    setTimeout(async () => {
      try {
        await this.connect();
        logger.queue("Successfully reconnected to RabbitMQ");
      } catch (error) {
        logger.error(
          `Reconnection attempt ${this.reconnectAttempts} failed:`,
          error
        );
        this.reconnect();
      }
    }, delay);
  }

  /**
   * Consume messages from a specific queue
   * @param {string} queueName - Name of the queue to consume from
   * @param {Function} messageHandler - Function to handle incoming messages
   * @param {Object} options - Consumption options
   */
  async consume(queueName, messageHandler, options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const consumerTag = await this.channel.consume(
        queueName,
        async (message) => {
          if (message) {
            try {
              const content = JSON.parse(message.content.toString());
              const startTime = Date.now();

              logger.queue("Processing message", {
                queue: queueName,
                messageId: content.id || "unknown",
                type: content.type,
                attempt: message.properties.headers?.["x-retry-count"] || 1,
              });

              await messageHandler(content, message);

              // Acknowledge message on successful processing
              this.channel.ack(message);

              const processingTime = Date.now() - startTime;
              logger.queue("Message processed successfully", {
                queue: queueName,
                messageId: content.id || "unknown",
                processingTime,
              });
            } catch (error) {
              logger.error("Error processing message:", error, {
                queue: queueName,
                messageId: message.properties.messageId,
              });

              // Handle message retry logic
              await this.handleMessageError(message, error);
            }
          }
        },
        {
          noAck: false,
          ...options,
        }
      );

      logger.queue(`Started consuming from queue: ${queueName}`, {
        consumerTag,
      });
      return consumerTag;
    } catch (error) {
      logger.error(`Failed to consume from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Handle message processing errors with retry logic
   * @param {Object} message - The failed message
   * @param {Error} error - The error that occurred
   */
  async handleMessageError(message, error) {
    const retryCount = (message.properties.headers?.["x-retry-count"] || 0) + 1;
    const maxRetries = config.get("MAX_RETRY_ATTEMPTS");

    if (retryCount <= maxRetries) {
      // Retry the message
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff

      logger.queue("Retrying message", {
        messageId: message.properties.messageId,
        retryCount,
        maxRetries,
        delay,
      });

      setTimeout(() => {
        try {
          const content = JSON.parse(message.content.toString());
          this.channel.publish(
            this.exchange,
            message.fields.routingKey,
            Buffer.from(JSON.stringify(content)),
            {
              persistent: true,
              headers: {
                "x-retry-count": retryCount,
                "x-original-error": error.message,
              },
            }
          );
          this.channel.ack(message);
        } catch (retryError) {
          logger.error("Failed to retry message:", retryError);
          this.channel.nack(message, false, false); // Dead letter
        }
      }, delay);
    } else {
      // Max retries exceeded, send to dead letter queue
      logger.error("Max retries exceeded for message", {
        messageId: message.properties.messageId,
        retryCount,
        finalError: error.message,
      });

      this.channel.nack(message, false, false); // Dead letter
    }
  }

  /**
   * Publish a message to an exchange
   * @param {string} routingKey - Routing key for the message
   * @param {Object} data - Message data
   */
  async publish(routingKey, data) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const message = {
        ...data,
        timestamp: new Date().toISOString(),
        service: "notification-service",
      };

      const published = this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: "application/json",
          messageId: data.id || require("uuid").v4(),
        }
      );

      if (published) {
        logger.queue("Message published successfully", {
          routingKey,
          messageId: data.id,
        });
      }

      return published;
    } catch (error) {
      logger.error("Error publishing message:", error, { routingKey });
      throw error;
    }
  }

  /**
   * Close the RabbitMQ connection
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      logger.queue("RabbitMQ connection closed");
    } catch (error) {
      logger.error("Error closing RabbitMQ connection:", error);
    }
  }

  /**
   * Get connection status and statistics
   */
  getStatus() {
    return {
      connected: this.isConnected,
      url: this.url,
      exchange: this.exchange,
      queues: this.queues,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Health check for RabbitMQ connection
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, error: "Not connected" };
      }

      // Try to assert a temporary queue to test connection
      const testQueue = `health-check-${Date.now()}`;
      await this.channel.assertQueue(testQueue, { autoDelete: true });
      await this.channel.deleteQueue(testQueue);

      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

module.exports = new RabbitMQConfig();
