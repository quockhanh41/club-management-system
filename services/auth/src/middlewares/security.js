const helmet = require("helmet");
const logger = require("../config/logger");
const { AuthenticationError, AuthorizationError } = require("../utils/errors");

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// API Gateway secret validation (for public routes)
const validateApiGatewaySecret = (req, res, next) => {
  //DEBUG: Log all headers for debugging Kong JWT claims injection
  logger.info("🔍 DEBUG: Incoming headers from Kong (Public Route)", {
    path: req.path,
    method: req.method,
    allHeaders: req.headers,
  });

  // Check if request is from API Gateway - MANDATORY for all requests
  const gatewaySecret = req.headers["x-api-gateway-secret"];
  const expectedSecret = process.env.API_GATEWAY_SECRET;

  if (!gatewaySecret || gatewaySecret !== expectedSecret) {
    logger.debug("AUTH SERVICE: Public request (No Gateway Secret)", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
      hasSecret: !!gatewaySecret,
    });

    // ALLOW request to proceed in ALB architecture
  }

  logger.debug("Gateway secret validation passed", {
    path: req.path,
    method: req.method,
  });

  next();
};

// API Gateway header validation (for protected routes)
const validateApiGatewayHeaders = (req, res, next) => {
  const requiredHeaders = ["x-user-id", "x-user-role"];
  const optionalHeaders = ["x-user-email", "x-request-id"];

  //DEBUG: Log all headers for debugging Kong JWT claims injection
  logger.info("🔍 DEBUG: Incoming headers from Kong (Protected Route)", {
    path: req.path,
    method: req.method,
    allHeaders: req.headers,
  });

  // Check if request is from API Gateway - MANDATORY for all requests
  const gatewaySecret = req.headers["x-api-gateway-secret"];
  const expectedSecret = process.env.API_GATEWAY_SECRET;

  if (!gatewaySecret || gatewaySecret !== expectedSecret) {
    logger.warn("Request rejected: Invalid or missing gateway secret", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
      hasSecret: !!gatewaySecret,
      secretMatch: gatewaySecret === expectedSecret,
    });

    return res.status(401).json({
      success: false,
      message: "Unauthorized: Request must come through API Gateway",
      code: "INVALID_GATEWAY",
    });
  }

  logger.debug("Gateway secret validation passed", {
    path: req.path,
    method: req.method,
  });

  // Validate required headers for protected endpoints
  const missingHeaders = requiredHeaders.filter(
    (header) => !req.headers[header]
  );

  if (missingHeaders.length > 0) {
    logger.warn("Missing required headers", {
      missing: missingHeaders,
      ip: req.ip,
      path: req.path,
    });

    return next(
      new AuthenticationError("Missing required authentication headers")
    );
  }

  // Extract and validate user information
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];
  const userEmail = req.headers["x-user-email"];

  // Validate UUID format for user ID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return next(new AuthenticationError("Invalid user ID format"));
  }

  // Validate role
  if (!["user", "admin"].includes(userRole)) {
    return next(new AuthenticationError("Invalid user role"));
  }

  // Validate email format if provided
  if (userEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return next(new AuthenticationError("Invalid email format"));
    }
  }

  // Store user info in request object for easy access
  req.user = {
    id: userId,
    role: userRole,
    email: userEmail,
  };

  // Log successful authentication
  logger.debug("User authenticated via gateway headers", {
    userId,
    userRole,
    path: req.path,
  });

  next();
};

// Role-based access control middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn("Insufficient permissions", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return next(new AuthorizationError("Insufficient permissions"));
    }

    next();
  };
};

// Admin only middleware
const requireAdmin = requireRole(["admin"]);

// User or Admin middleware
const requireUser = requireRole(["user", "admin"]);

// Self or Admin access middleware (user can only access their own data)
const requireSelfOrAdmin = (userIdParam = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required"));
    }

    const requestedUserId =
      req.params[userIdParam] || req.body.userId || req.query.userId;

    // Admin can access any user's data
    if (req.user.role === "admin") {
      return next();
    }

    // User can only access their own data
    if (req.user.id !== requestedUserId) {
      logger.warn("Unauthorized access attempt", {
        userId: req.user.id,
        requestedUserId,
        path: req.path,
      });

      return next(new AuthorizationError("Can only access your own data"));
    }

    next();
  };
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  // Remove potentially dangerous characters from strings
  const sanitizeString = (str) => {
    if (typeof str !== "string") return str;

    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/javascript:/gi, "") // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .trim();
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== "object") {
      return typeof obj === "string" ? sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id,
    requestId: req.headers["x-request-id"],
  });

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      requestId: req.headers["x-request-id"],
    });
  });

  next();
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const nodeEnv = process.env.NODE_ENV || "development";
    const corsOrigin = process.env.CORS_ORIGIN;

    let allowedOrigins = ["http://localhost:3000"]; // default

    if (corsOrigin) {
      if (corsOrigin === "*") {
        allowedOrigins = ["*"];
      } else if (typeof corsOrigin === "string") {
        allowedOrigins = corsOrigin.includes(",")
          ? corsOrigin.split(",").map((url) => url.trim())
          : [corsOrigin];
      } else if (Array.isArray(corsOrigin)) {
        allowedOrigins = corsOrigin;
      }
    }

    // In development, be more permissive for API testing
    if (nodeEnv === "development") {
      // Allow requests with no origin (curl, Postman, mobile apps, etc.)
      if (!origin) return callback(null, true);

      // Allow localhost with any port for development
      if (
        origin.startsWith("http://localhost") ||
        origin.startsWith("https://localhost")
      ) {
        return callback(null, true);
      }

      // Allow configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, log but allow other origins
      logger.warn("Unknown origin in development mode, allowing anyway", {
        origin,
      });
      return callback(null, true);
    }

    // Production mode - strict origin checking
    // Allow requests with no origin (mobile apps, server-to-server, etc.)
    if (!origin) return callback(null, true);

    // Handle wildcard origin
    if (allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn("Blocked by CORS policy", { origin, allowedOrigins });
      callback(new Error("Not allowed by CORS policy"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-User-ID",
    "X-User-Role",
    "X-User-Email",
    "X-Request-ID",
    "x-api-gateway-secret",
    "Accept",
    "Origin",
    "User-Agent",
    "DNT",
    "Cache-Control",
    "X-Mx-ReqToken",
    "Keep-Alive",
    "If-Modified-Since",
  ],
  exposedHeaders: [
    "X-Request-ID",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
  ],
  maxAge: 86400, // 24 hours preflight cache
};

module.exports = {
  securityHeaders,
  validateApiGatewaySecret,
  validateApiGatewayHeaders,
  requireRole,
  requireAdmin,
  requireUser,
  requireSelfOrAdmin,
  sanitizeRequest,
  requestLogger,
  corsOptions,
};
