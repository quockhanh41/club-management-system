require("dotenv").config();
const Joi = require("joi");

/**
 * Centralized Configuration Management for Auth Service
 * Validates all environment variables and provides type-safe access
 */
class ConfigManager {
  constructor() {
    this.config = null;
    this.loadAndValidateConfig();
  }

  /**
   * Configuration schema with validation rules
   */
  getConfigSchema() {
    return Joi.object({
      // Environment
      NODE_ENV: Joi.string()
        .valid("development", "test", "production")
        .default("development"),

      // Server Configuration
      PORT: Joi.number().port().default(3000),

      SERVICE_VERSION: Joi.string().default("1.0.0"),

      // Database Configuration
      DATABASE_URL: Joi.string().uri({ scheme: "postgresql" }).optional(),

      DB_HOST: Joi.string()
        .hostname()
        .when("DATABASE_URL", {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.string().hostname().default("localhost"),
        }),

      DB_PORT: Joi.number()
        .port()
        .when("DATABASE_URL", {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.number().port().default(5432),
        }),

      DB_NAME: Joi.string().when("DATABASE_URL", {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required().messages({
          "any.required":
            "Database name (DB_NAME) is required when DATABASE_URL is not provided",
        }),
      }),

      DB_USERNAME: Joi.string().when("DATABASE_URL", {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required().messages({
          "any.required":
            "Database username (DB_USERNAME) is required when DATABASE_URL is not provided",
        }),
      }),

      DB_PASSWORD: Joi.string().when("DATABASE_URL", {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required().messages({
          "any.required":
            "Database password (DB_PASSWORD) is required when DATABASE_URL is not provided",
        }),
      }),

      DB_DIALECT: Joi.string()
        .valid("postgres", "mysql", "sqlite", "mariadb")
        .default("postgres"),

      DB_LOGGING: Joi.boolean().default(false),

      DB_SSL: Joi.boolean().default(false),

      // Test Database Configuration
      TEST_DB_HOST: Joi.string().hostname().default("localhost"),

      TEST_DB_PORT: Joi.number().port().default(5432),

      TEST_DB_NAME: Joi.string().default("club_management_auth_test"),

      TEST_DB_USERNAME: Joi.string().default("postgres"),

      TEST_DB_PASSWORD: Joi.string().default("password"),

      // JWT Configuration - Asymmetric
      JWT_ALGORITHM: Joi.string()
        .valid("RS256", "RS384", "RS512")
        .default("RS256"),

      JWT_PRIVATE_KEY_PATH: Joi.string().default(
        "./src/config/keys/private.pem"
      ),

      JWT_PRIVATE_KEY_CONTENT: Joi.string().optional(),

      JWT_PUBLIC_KEY_PATH: Joi.string().default("./src/config/keys/public.pem"),

      JWT_PUBLIC_KEY_CONTENT: Joi.string().optional(),

      JWT_EXPIRES_IN: Joi.string().default("15m"),

      // Refresh Token - Keep symmetric for security
      REFRESH_TOKEN_SECRET: Joi.string().min(32).required().messages({
        "any.required":
          "Refresh token secret (REFRESH_TOKEN_SECRET) is required",
        "string.min":
          "Refresh token secret must be at least 32 characters long",
      }),

      REFRESH_TOKEN_EXPIRES_IN: Joi.string().default("7d"),

      // RabbitMQ Configuration
      RABBITMQ_URL: Joi.string()
        .uri({ scheme: ["amqp", "amqps"] })
        .default("amqp://localhost:5672"),

      RABBITMQ_EXCHANGE: Joi.string().default("club_events"),

      RABBITMQ_QUEUE: Joi.string().default("auth_events"),

      // Frontend URLs
      FRONTEND_BASE_URL: Joi.string().uri().default("http://localhost:3000"),

      FRONTEND_URL: Joi.string().uri().default("http://localhost:3000"),

      // Logging Configuration
      LOG_LEVEL: Joi.string()
        .valid("error", "warn", "info", "debug", "verbose")
        .default("info"),

      // Security Configuration
      BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),

      MAX_LOGIN_ATTEMPTS: Joi.number().integer().min(3).max(10).default(5),

      ACCOUNT_LOCK_TIME_MS: Joi.number()
        .integer()
        .min(300000) // 5 minutes minimum
        .default(1800000), // 30 minutes

      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(900000), // 15 minutes

      RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().default(100),

      // CORS Configuration
      CORS_ORIGIN: Joi.alternatives()
        .try(
          Joi.string().valid("*"),
          Joi.string().uri(),
          Joi.array().items(Joi.string().uri())
        )
        .default("*"),

      // Health Check Configuration
      HEALTH_CHECK_TIMEOUT_MS: Joi.number().integer().default(5000),

      // Session Configuration
      SESSION_SECRET: Joi.string()
        .min(32)
        .default("auth-service-session-secret-change-in-production"),

      // Development/Debug flags
      DEBUG_SQL: Joi.boolean().default(false),

      ENABLE_REQUEST_LOGGING: Joi.boolean().default(true),

      // Test-only toggle to auto verify emails during registration
      AUTO_VERIFY_EMAILS: Joi.boolean().default(false),
    }).unknown(false); // Reject unknown environment variables
  }

  /**
   * Load and validate configuration from environment variables
   */
  loadAndValidateConfig() {
    const schema = this.getConfigSchema();

    // Extract environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
      SERVICE_VERSION: process.env.SERVICE_VERSION,

      // Database
      DATABASE_URL: process.env.DATABASE_URL,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT
        ? parseInt(process.env.DB_PORT, 10)
        : undefined,
      DB_NAME: process.env.DB_NAME,
      DB_USERNAME: process.env.DB_USERNAME,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_DIALECT: process.env.DB_DIALECT,
      DB_LOGGING: process.env.DB_LOGGING === "true",
      DB_SSL: process.env.DB_SSL === "true",

      // Test Database
      TEST_DB_HOST: process.env.TEST_DB_HOST,
      TEST_DB_PORT: process.env.TEST_DB_PORT
        ? parseInt(process.env.TEST_DB_PORT, 10)
        : undefined,
      TEST_DB_NAME: process.env.TEST_DB_NAME,
      TEST_DB_USERNAME: process.env.TEST_DB_USERNAME,
      TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD,

      // JWT
      JWT_ALGORITHM: process.env.JWT_ALGORITHM,
      JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH,
      JWT_PRIVATE_KEY_CONTENT: process.env.JWT_PRIVATE_KEY_CONTENT,
      JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH,
      JWT_PUBLIC_KEY_CONTENT: process.env.JWT_PUBLIC_KEY_CONTENT,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,

      // RabbitMQ
      RABBITMQ_URL: process.env.RABBITMQ_URL,
      RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE,
      RABBITMQ_QUEUE: process.env.RABBITMQ_QUEUE,

      // Frontend
      FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL,
      FRONTEND_URL: process.env.FRONTEND_URL,

      // Logging
      LOG_LEVEL: process.env.LOG_LEVEL,

      // Security
      BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS
        ? parseInt(process.env.BCRYPT_ROUNDS, 10)
        : undefined,
      MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS
        ? parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10)
        : undefined,
      ACCOUNT_LOCK_TIME_MS: process.env.ACCOUNT_LOCK_TIME_MS
        ? parseInt(process.env.ACCOUNT_LOCK_TIME_MS, 10)
        : undefined,

      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS
        ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)
        : undefined,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS
        ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
        : undefined,

      // CORS
      CORS_ORIGIN: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.includes(",")
          ? process.env.CORS_ORIGIN.split(",").map((url) => url.trim())
          : process.env.CORS_ORIGIN
        : undefined,

      // Health Check
      HEALTH_CHECK_TIMEOUT_MS: process.env.HEALTH_CHECK_TIMEOUT_MS
        ? parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS, 10)
        : undefined,

      // Session
      SESSION_SECRET: process.env.SESSION_SECRET,

      // Debug
      DEBUG_SQL: process.env.DEBUG_SQL === "true",
      ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== "false",
      AUTO_VERIFY_EMAILS: process.env.AUTO_VERIFY_EMAILS === "true",
    };

    // Validate configuration
    const { error, value } = schema.validate(envVars, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => `${detail.path.join(".")}: ${detail.message}`)
        .join("\n");

      console.error("Configuration validation failed:");
      console.error(errorMessage);
      process.exit(1);
    }

    this.config = value;

    // Log configuration summary (without sensitive data)
    const configSummary = {
      environment: this.config.NODE_ENV,
      port: this.config.PORT,
      database: {
        host: this.config.DB_HOST,
        port: this.config.DB_PORT,
        dialect: this.config.DB_DIALECT,
      },
      rabbitmq: {
        exchange: this.config.RABBITMQ_EXCHANGE,
        queue: this.config.RABBITMQ_QUEUE,
      },
      logLevel: this.config.LOG_LEVEL,
    };

    console.log(
      "Configuration loaded successfully:",
      JSON.stringify(configSummary, null, 2)
    );
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return this.config.NODE_ENV === "development";
  }

  /**
   * Check if running in test mode
   */
  isTest() {
    return this.config.NODE_ENV === "test";
  }

  /**
   * Check if running in production mode
   */
  isProduction() {
    return this.config.NODE_ENV === "production";
  }

  /**
   * Get database configuration for current environment
   */
  getDatabaseConfig() {
    // Support both individual DB config variables and DATABASE_URL
    const databaseUrl =
      process.env.DATABASE_URL ||
      `postgresql://${this.config.DB_USERNAME}:${this.config.DB_PASSWORD}@${this.config.DB_HOST}:${this.config.DB_PORT}/${this.config.DB_NAME}`;

    if (process.env.DATABASE_URL) {
      // Parse DATABASE_URL for Supabase/cloud providers
      const url = new URL(databaseUrl);

      const baseConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading slash
        username: url.username,
        password: url.password,
        dialect: this.config.DB_DIALECT,
        logging: this.config.DB_LOGGING ? console.log : false,
        pool: {
          max: this.isProduction() ? 20 : 5,
          min: this.isProduction() ? 5 : 0,
          acquire: 30000,
          idle: 10000,
        },
        define: {
          timestamps: true,
          underscored: true,
          paranoid: true,
        },
      };

      // Add SSL configuration for cloud databases
      if (
        url.hostname.includes("supabase.com") ||
        url.hostname.includes("amazonaws.com") ||
        this.config.DB_SSL
      ) {
        baseConfig.dialectOptions = {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        };
      }

      return baseConfig;
    }

    const baseConfig = {
      host: this.config.DB_HOST,
      port: this.config.DB_PORT,
      database: this.config.DB_NAME,
      username: this.config.DB_USERNAME,
      password: this.config.DB_PASSWORD,
      dialect: this.config.DB_DIALECT,
      logging: this.config.DB_LOGGING ? console.log : false,
      pool: {
        max: this.isProduction() ? 20 : 5,
        min: this.isProduction() ? 5 : 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        paranoid: true,
      },
    };

    // Add SSL configuration for production
    if (this.isProduction() && this.config.DB_SSL) {
      baseConfig.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      };
    }

    return baseConfig;
  }

  /**
   * Get test database configuration
   */
  getTestDatabaseConfig() {
    // Use in-memory SQLite for tests to avoid database setup complexity
    return {
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        paranoid: true,
      },
    };
  }

  /**
   * Get JWT configuration
   */
  getJWTConfig() {
    return {
      algorithm: this.config.JWT_ALGORITHM,
      privateKeyPath: this.config.JWT_PRIVATE_KEY_PATH,
      privateKeyContent: this.config.JWT_PRIVATE_KEY_CONTENT,
      publicKeyPath: this.config.JWT_PUBLIC_KEY_PATH,
      publicKeyContent: this.config.JWT_PUBLIC_KEY_CONTENT,
      accessTokenExpiry: this.config.JWT_EXPIRES_IN,
      refreshTokenSecret: this.config.REFRESH_TOKEN_SECRET,
      refreshTokenExpiry: this.config.REFRESH_TOKEN_EXPIRES_IN,
    };
  }

  /**
   * Get RabbitMQ configuration
   */
  getRabbitMQConfig() {
    return {
      url: this.config.RABBITMQ_URL,
      exchange: this.config.RABBITMQ_EXCHANGE,
      queue: this.config.RABBITMQ_QUEUE,
    };
  }

  /**
   * Get frontend URLs
   */
  getFrontendConfig() {
    return {
      baseUrl: this.config.FRONTEND_BASE_URL,
      url: this.config.FRONTEND_URL,
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return {
      bcryptRounds: this.config.BCRYPT_ROUNDS,
      maxLoginAttempts: this.config.MAX_LOGIN_ATTEMPTS,
      accountLockTimeMs: this.config.ACCOUNT_LOCK_TIME_MS,
      sessionSecret: this.config.SESSION_SECRET,
    };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: this.config.RATE_LIMIT_WINDOW_MS,
      max: this.config.RATE_LIMIT_MAX_REQUESTS,
    };
  }

  /**
   * Validate required configuration for specific features
   */
  validateFeatureConfig(feature) {
    const validations = {
      database: () => {
        const required = ["DB_HOST", "DB_NAME", "DB_USERNAME", "DB_PASSWORD"];
        return required.every((key) => this.config[key]);
      },
      jwt: () => {
        const required = ["JWT_SECRET", "REFRESH_TOKEN_SECRET"];
        return required.every((key) => this.config[key]);
      },
      rabbitmq: () => {
        return !!this.config.RABBITMQ_URL;
      },
    };

    const validator = validations[feature];
    if (!validator) {
      throw new Error(`Unknown feature: ${feature}`);
    }

    return validator();
  }
}

// Export singleton instance
module.exports = new ConfigManager();
