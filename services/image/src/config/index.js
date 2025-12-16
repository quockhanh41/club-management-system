require("dotenv").config();
const Joi = require("joi");

class ConfigManager {
  constructor() {
    this.config = null;
    this.loadAndValidateConfig();
  }

  getConfigSchema() {
    return Joi.object({
      NODE_ENV: Joi.string()
        .valid("development", "test", "production")
        .default("development"),

      PORT: Joi.number().port().default(3004),

      // Cloudinary (Required for Storage)
      CLOUDINARY_CLOUD_NAME: Joi.string().required(),
      CLOUDINARY_API_KEY: Joi.string().required(),
      CLOUDINARY_API_SECRET: Joi.string().required(),

      // RabbitMQ (Required for Events)
      RABBITMQ_URL: Joi.string()
        .uri({ scheme: ["amqp", "amqps"] })
        .default("amqp://localhost:5672"),

      // Upload Limits
      MAX_FILE_SIZE: Joi.string().default("10MB"),
      MAX_FILES: Joi.number().default(10),
    }).unknown(true);
  }

  loadAndValidateConfig() {
    const schema = this.getConfigSchema();
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,

      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

      RABBITMQ_URL: process.env.RABBITMQ_URL,

      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
      MAX_FILES: process.env.MAX_FILES,
    };

    const { error, value } = schema.validate(envVars, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      console.error(
        "❌ Configuration validation failed:",
        error.details.map((d) => d.message).join(", ")
      );
      process.exit(1);
    }

    this.config = value;
    console.log("✅ Configuration loaded successfully");
  }

  get(key) {
    return this.config[key];
  }
}

module.exports = new ConfigManager();
