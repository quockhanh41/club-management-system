const amqp = require("amqplib");
const config = require("./index");

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(config.get("RABBITMQ_URL"));
      this.channel = await this.connection.createChannel();

      // Declare exchange for image events
      await this.channel.assertExchange("image_events", "topic", {
        durable: true,
      });

      console.log("✅ Connected to RabbitMQ");
      return this.channel;
    } catch (error) {
      console.error("❌ RabbitMQ connection error:", error.message);
      throw error;
    }
  }

  async publishImageUploaded(imageData) {
    try {
      if (!this.channel) {
        throw new Error("RabbitMQ channel not initialized");
      }

      const message = {
        event_type: "image_uploaded",
        timestamp: new Date().toISOString(),
        data: imageData,
      };

      // Publish to different routing keys based on image type
      const routingKey = `image.${imageData.type}`;

      await this.channel.publish(
        "image_events",
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      console.log(`📤 Published image event: ${routingKey}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to publish image event:", error.message);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log("🔌 RabbitMQ connection closed");
    } catch (error) {
      console.error("❌ Error closing RabbitMQ connection:", error.message);
    }
  }
}

module.exports = new RabbitMQService();
