// API Gateway Secret validation middleware
const validateApiGatewaySecret = (req, res, next) => {
  const gatewaySecret = req.headers["x-api-gateway-secret"];
  const expectedSecret = process.env.API_GATEWAY_SECRET;

  if (!gatewaySecret || gatewaySecret !== expectedSecret) {
    console.debug("IMAGE SERVICE: Request without gateway secret", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      hasSecret: !!gatewaySecret,
    });

    // In test/CI environment or when explicitly required, enforce gateway secret
    if (
      process.env.NODE_ENV === "test" ||
      process.env.CI === "true" ||
      process.env.ENFORCE_GATEWAY_SECRET === "true"
    ) {
      return res.status(403).json({
        error: "Access denied: Invalid or missing API Gateway secret",
      });
    }

    // ALLOW request to proceed in ALB architecture for staging/production
  }

  next();
};

// JWT user extraction middleware (user info comes from Kong JWT plugin)
const extractUserInfo = (req, res, next) => {
  // Extract user info from headers set by Kong JWT plugin
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
        error.message,
      );
      userFullName = userFullNameRaw;
    }
  }

  if (!userId) {
    return res.status(401).json({
      error: "Authentication required: User ID not found",
    });
  }

  // Attach user info to request for use in controllers
  req.user = {
    id: userId,
    email: userEmail,
    role: userRole,
    full_name: userFullName,
  };

  next();
};

// Authorization middleware for different operations
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }
  next();
};

// Admin role requirement
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required",
    });
  }
  next();
};

// Club manager authorization for club-related images
const requireClubManagerOrAdmin = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admins can do everything
    if (userRole === "admin") {
      return next();
    }

    // Import ownership service for verification
    const ownershipService = require("../services/ownershipService");

    // For club-related images, verify club manager access
    if (entity_type === "club") {
      if (!entity_id) {
        return res.status(400).json({
          error: "Club ID required for club image uploads",
        });
      }

      const hasClubAccess = await ownershipService.verifyClubManagerAccess(
        entity_id,
        userId,
      );
      if (!hasClubAccess) {
        return res.status(403).json({
          error:
            "Access denied: You must be a club manager or organizer to upload club images",
        });
      }
    }

    // For event-related images, verify event access
    if (entity_type === "event") {
      if (!entity_id) {
        return res.status(400).json({
          error: "Event ID required for event image uploads",
        });
      }

      const hasEventAccess = await ownershipService.verifyEventAccess(
        entity_id,
        userId,
      );
      if (!hasEventAccess) {
        return res.status(403).json({
          error:
            "Access denied: You must be the event creator, event organizer, or club manager/organizer to upload event images",
        });
      }
    }

    // For user profile images, only allow own profile
    if (entity_type === "user" && entity_id !== userId) {
      return res.status(403).json({
        error: "Can only upload images for your own profile",
      });
    }

    next();
  } catch (error) {
    console.error("❌ Authorization error:", error.message);
    res.status(500).json({
      error: "Authorization check failed",
    });
  }
};

module.exports = {
  validateApiGatewaySecret,
  extractUserInfo,
  requireAuth,
  requireAdmin,
  requireClubManagerOrAdmin,
};
