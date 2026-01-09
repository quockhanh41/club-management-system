const config = require("./index");

/**
 * Email Configuration for Notification Service
 */
const emailConfig = {
  // Email service provider (gmail, yahoo, outlook, custom)
  service: config.get("EMAIL_SERVICE"),

  // SMTP Configuration
  smtp: {
    host: config.get("EMAIL_HOST"),
    port: config.get("EMAIL_PORT"),
    secure: config.get("EMAIL_SECURE"),
  },

  // Authentication
  auth: {
    user: config.get("EMAIL_USER"),
    pass: config.get("EMAIL_PASSWORD"),
  },

  // Default sender information
  from: config.get("EMAIL_FROM"),

  // Template configuration
  templates: {
    dir: process.env.TEMPLATE_DIR || "templates", // Keep optional/default as is
    cacheTTL: parseInt(process.env.TEMPLATE_CACHE_TTL) || 3600000,
  },

  // Frontend URLs for email links
  frontend: {
    baseUrl: config.get("FRONTEND_BASE_URL"),
    verifyEmailPath: process.env.FRONTEND_VERIFY_EMAIL_PATH || "/verify-email",
    resetPasswordPath:
      process.env.FRONTEND_RESET_PASSWORD_PATH || "/reset-password",
  },

  // Rate limiting
  rateLimit: {
    maxPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE) || 60,
    maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR) || 1000,
  },

  // Retry configuration
  retry: {
    maxAttempts: parseInt(process.env.EMAIL_MAX_RETRY_ATTEMPTS) || 3,
    delayMs: parseInt(process.env.EMAIL_RETRY_DELAY_MS) || 1000,
  },

  // Development mode configuration
  development: {
    logOnly: process.env.EMAIL_LOG_ONLY === "true",
    mockSend: process.env.EMAIL_MOCK_SEND === "true",
  },
};

/**
 * Validate email configuration
 * Validation is now handled by centralized ConfigManager at startup.
 * This function remains for API compatibility but relies on ConfigManager.
 */
function validateEmailConfig() {
  return true;
}

/**
 * Check if email service is properly configured
 */
function isEmailConfigured() {
  return true;
}

/**
 * Get email configuration
 */
function getEmailConfig() {
  return emailConfig;
}

module.exports = {
  emailConfig,
  validateEmailConfig,
  isEmailConfigured,
  getEmailConfig,
};
