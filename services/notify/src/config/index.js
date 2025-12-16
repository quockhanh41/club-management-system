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

      PORT: Joi.number().port().default(3005),

      HOST: Joi.string().default("0.0.0.0"),

      // RabbitMQ
      RABBITMQ_URL: Joi.string()
        .uri({ scheme: ["amqp", "amqps"] })
        .default("amqp://localhost:5672"),

      RABBITMQ_EXCHANGE: Joi.string().default("club_events"),

      // Email Service (SMTP)
      EMAIL_SERVICE: Joi.string().default("gmail"),
      EMAIL_HOST: Joi.string().required(),
      EMAIL_PORT: Joi.number().default(587),
      EMAIL_SECURE: Joi.boolean().default(false),
      EMAIL_USER: Joi.string().required(),
      EMAIL_PASSWORD: Joi.string().required(),
      EMAIL_FROM: Joi.string().required(),

      // Security
      API_GATEWAY_SECRET: Joi.string().optional(), // Used if we add HTTP endpoints protected by gateway

      // Frontend Integration
      FRONTEND_BASE_URL: Joi.string().uri().default("http://localhost:3000"),

      // Resilience
      MAX_RETRY_ATTEMPTS: Joi.number().default(3),

      // Health Check
      HEALTH_CHECK_INTERVAL_MS: Joi.number().default(30000),
      ENABLE_HEALTH_LOGGING: Joi.boolean().default(false),
    }).unknown(true);
  }

  loadAndValidateConfig() {
    const schema = this.getConfigSchema();
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HOST: process.env.HOST,

      RABBITMQ_URL: process.env.RABBITMQ_URL,
      RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE,

      EMAIL_SERVICE: process.env.EMAIL_SERVICE,
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_SECURE: process.env.EMAIL_SECURE === "true",
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
      EMAIL_FROM: process.env.EMAIL_FROM,

      API_GATEWAY_SECRET: process.env.API_GATEWAY_SECRET,

      FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL,

      MAX_RETRY_ATTEMPTS: process.env.MAX_RETRY_ATTEMPTS,
      HEALTH_CHECK_INTERVAL_MS: process.env.HEALTH_CHECK_INTERVAL_MS,
      ENABLE_HEALTH_LOGGING: process.env.ENABLE_HEALTH_LOGGING === "true",
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
