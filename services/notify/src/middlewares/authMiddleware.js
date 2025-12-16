/**
 * Authentication middleware for Notification Service
 * Validates API Gateway secret header and extracts user information
 * REQUIRES trusted internal header validation first
 */

const logger = require("../config/logger");

/**
 * Main authentication middleware that validates gateway secret and extracts user info
 */
const authMiddleware = (req, res, next) => {
  try {
    // MANDATORY: Validate API Gateway secret header first
    const gatewaySecret = req.headers["x-api-gateway-secret"];
    const expectedSecret =
      process.env.API_GATEWAY_SECRET || "club-mgmt-internal-secret-2024";

    if (!gatewaySecret || gatewaySecret !== expectedSecret) {
      logger.debug("NOTIFY SERVICE: Public request (No Gateway Secret)", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get("User-Agent"),
        hasSecret: !!gatewaySecret,
      });

      // ALLOW request to proceed in ALB architecture
    }

    logger.debug("NOTIFY SERVICE: Gateway validation passed", {
      path: req.path,
      method: req.method,
    });

    // Extract user information from validated Kong-injected headers
    const userId = req.headers["x-user-id"];
    const userEmail = req.headers["x-user-email"];
    const userRole = req.headers["x-user-role"];
    const userFullNameRaw = req.headers["x-user-full-name"];

    // Decode base64 encoded full_name (to handle UTF-8 characters like Vietnamese names)
    let userFullName = userFullNameRaw;
    if (userFullNameRaw) {
      try {
        userFullName = Buffer.from(userFullNameRaw, "base64").toString("utf8");
        console.debug("Decoded full_name from base64:", {
          original: userFullNameRaw,
          decoded: userFullName,
        });
      } catch (error) {
        console.warn(
          "Failed to decode base64 full_name, using original value:",
          error.message
        );
        userFullName = userFullNameRaw;
      }
    }

    // For notification service, user info is optional in some cases
    // (e.g., system-generated notifications), so we don't require all headers
    if (userId && userEmail && userRole) {
      // Validate user role if provided
      const validRoles = ["USER", "ADMIN"];
      if (!validRoles.includes(userRole)) {
        logger.warn("Invalid user role from API Gateway", {
          userId,
          userRole,
          path: req.path,
          method: req.method,
        });

        return res.status(401).json({
          success: false,
          message: "Invalid user role",
          code: "INVALID_ROLE",
        });
      }

      // Attach user information to request object
      req.user = {
        id: userId,
        email: userEmail,
        role: userRole,
        full_name: userFullName,
      };

      logger.debug("NOTIFY SERVICE: User authenticated via API Gateway", {
        userId: req.user.id,
        userRole: req.user.role,
        path: req.path,
        method: req.method,
      });
    } else {
      // No user context - may be system notification
      logger.debug(
        "NOTIFY SERVICE: Request without user context (system notification)",
        {
          path: req.path,
          method: req.method,
        }
      );
    }

    next();
  } catch (error) {
    logger.error("NOTIFY SERVICE: Authentication middleware error:", {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });

    return res.status(500).json({
      success: false,
      message: "Internal authentication error",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Middleware to require user authentication for specific endpoints
 */
const requireUser = (req, res, next) => {
  if (!req.user) {
    logger.warn("NOTIFY SERVICE: User authentication required but not found", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return res.status(401).json({
      success: false,
      message: "User authentication required",
      code: "AUTH_REQUIRED",
    });
  }

  next();
};

/**
 * Middleware to require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    logger.warn("NOTIFY SERVICE: Admin access denied", {
      userId: req.user?.id,
      userRole: req.user?.role,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      message: "Admin access required",
      code: "FORBIDDEN",
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  requireUser,
  requireAdmin,
};
