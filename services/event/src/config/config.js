import Joi from "joi";
import dotenv from "dotenv";

dotenv.config();

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

      PORT: Joi.number().port().default(3003), // Event service default port

      // Database
      MONGODB_URI: Joi.string()
        .uri({ scheme: ["mongodb", "mongodb+srv"] })
        .required(),

      // RabbitMQ
      RABBITMQ_URL: Joi.string()
        .uri({ scheme: ["amqp", "amqps"] })
        .optional(),

      // Security
      API_GATEWAY_SECRET: Joi.string().required(),

      // Other flags
      MOCK_DB: Joi.boolean().default(false),
    }).unknown(true);
  }

  loadAndValidateConfig() {
    const schema = this.getConfigSchema();
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI,
      RABBITMQ_URL: process.env.RABBITMQ_URL,
      API_GATEWAY_SECRET: process.env.API_GATEWAY_SECRET,
      MOCK_DB: process.env.MOCK_DB === "true",
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

const configManager = new ConfigManager();
export default configManager;
