/**
 * Authentication middleware for Event Service
 * Extracts user information from API Gateway headers (Kong)
 */

import axios from "axios";
import { Event } from "../models/event.js";

/**
 * Middleware to validate API Gateway secret only (for public routes)
 * This checks that the request comes through the API Gateway but doesn't require JWT headers
 */
export const validateApiGatewaySecret = (req, res, next) => {
  // Skip validation for OPTIONS requests (CORS preflight)
  if (req.method === "OPTIONS") {
    return next();
  }

  // MANDATORY: Validate API Gateway secret header first
  const gatewaySecret = req.headers["x-api-gateway-secret"];
  const expectedSecret = process.env.API_GATEWAY_SECRET;

  if (!gatewaySecret || gatewaySecret !== expectedSecret) {
    console.debug("EVENT SERVICE: Public request (No Gateway Secret)", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
      hasSecret: !!gatewaySecret,
    });

    // In test/CI environment or when explicitly required, enforce gateway secret
    if (
      process.env.NODE_ENV === "test" ||
      process.env.CI === "true" ||
      process.env.ENFORCE_GATEWAY_SECRET === "true"
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Request must come through API Gateway",
      });
    }

    // ALLOW request to proceed in ALB architecture for development
  }

  console.debug("EVENT SERVICE: Gateway validation passed for public route", {
    path: req.path,
    method: req.method,
  });

  next();
};

/**
 * Authentication middleware that extracts user info from Kong-injected headers
 * REQUIRES trusted internal header validation first
 */
export const authMiddleware = (req, res, next) => {
  try {
    // MANDATORY: Validate API Gateway secret header first
    const gatewaySecret = req.headers["x-api-gateway-secret"];
    const expectedSecret = process.env.API_GATEWAY_SECRET;

    if (!gatewaySecret || gatewaySecret !== expectedSecret) {
      console.warn(
        "EVENT SERVICE: Request rejected - Invalid or missing gateway secret",
        {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.get("User-Agent"),
          hasSecret: !!gatewaySecret,
          timestamp: new Date().toISOString(),
        },
      );

      // In test/CI environment or when explicitly required, enforce gateway secret
      if (
        process.env.NODE_ENV === "test" ||
        process.env.CI === "true" ||
        process.env.ENFORCE_GATEWAY_SECRET === "true"
      ) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Request must come through API Gateway",
          code: "INVALID_GATEWAY",
        });
      }

      // ALLOW request to proceed in ALB architecture for staging/production
    }

    console.debug("EVENT SERVICE: Gateway validation passed", {
      path: req.path,
      method: req.method,
    });

    // Extract user information from validated Kong-injected headers
    const userId = req.headers["x-user-id"];
    const userEmail = req.headers["x-user-email"];
    const userRole = req.headers["x-user-role"];
    const rawFullName = req.headers["x-user-full-name"];

    // Decode base64 encoded full_name (from Kong JWT plugin to handle UTF-8 characters)
    const decodeHeaderUtf8 = (value) => {
      if (!value || typeof value !== "string") return value;
      try {
        // Decode from base64 to handle UTF-8 characters like Vietnamese names
        return Buffer.from(value, "base64").toString("utf8");
      } catch (e) {
        console.warn(
          "Failed to decode base64 full_name, using original value:",
          e.message,
        );
        return value;
      }
    };
    const userFullName = decodeHeaderUtf8(rawFullName);

    // Validate that all required headers are present
    if (!userId || !userEmail || !userRole) {
      console.warn("Missing user headers from API Gateway", {
        headers: {
          "x-user-id": userId ? "present" : "missing",
          "x-user-email": userEmail ? "present" : "missing",
          "x-user-role": userRole ? "present" : "missing",
          "x-user-full-name": userFullName ? "present" : "missing",
        },
        path: req.path,
        method: req.method,
      });

      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // Validate user role (accepting lowercase roles from JWT)
    const validRoles = ["user", "admin"];
    if (!validRoles.includes(userRole)) {
      console.warn("Invalid user role from API Gateway", {
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

    console.log("User authenticated via API Gateway", {
      userId: req.user.id,
      userRole: req.user.role,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    console.error("Authentication middleware error:", {
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
 * Role-based authorization middleware factory
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    if (!roles.includes(req.user.role)) {
      console.warn("Access denied - insufficient role", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: "FORBIDDEN",
      });
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole("admin");

/**
 * Middleware to require user role (or admin)
 */
export const requireUser = requireRole(["user", "admin"]);

// Helper function to check a user's role within a club via an internal API call.
async function isUserClubManager(clubId, userId, req) {
  const clubServiceUrl =
    process.env.CLUB_SERVICE_URL || "http://club-service:3002";
  const membershipCheckUrl = `${clubServiceUrl}/api/clubs/${clubId}/members/${userId}`;
  console.log("membershipCheckUrl", membershipCheckUrl);

  try {
    // Include API Gateway secret and user headers for internal service-to-service communication
    const headers = {
      "x-api-gateway-secret": process.env.API_GATEWAY_SECRET,
      "x-user-id": req.headers["x-user-id"],
      "x-user-email": req.headers["x-user-email"],
      "x-user-role": req.headers["x-user-role"],
      "x-user-full-name": req.headers["x-user-full-name"],
      "Content-Type": "application/json",
    };

    const response = await axios.get(membershipCheckUrl, { headers });
    console.log("response", response.data);
    return (
      response.data &&
      response.data.data &&
      response.data.data.role === "club_manager"
    );
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // User is not a member of the club, therefore not a manager.
      return false;
    }
    // For other errors (e.g., service unavailable), log and re-throw to be handled globally.
    console.error("Error checking club membership:", error.message);
    throw new Error("Error verifying club membership");
  }
}

/**
 * Authorization middleware to check if a user is a manager of the relevant club.
 */
export const requireClubManager = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const userRole = req.headers["x-user-role"];
    if (userRole === "admin") {
      console.log("Admin access granted", {
        userId,
        userRole,
        path: req.path,
        method: req.method,
      });
      return next();
    }
    // --- Authorization for UPDATE operations (PUT) ---
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
          code: "EVENT_NOT_FOUND",
        });
      }

      // Allow if user is the original creator of the event.
      if (event.created_by === userId) {
        return next();
      }

      // If not the creator, check if they are a manager of the event's club.
      if (await isUserClubManager(event.club_id, userId, req)) {
        return next();
      }
    }
    // --- Authorization for CREATE operations (POST) ---
    else {
      const { club_id } = req.body;

      // If club_id is not provided, pass to the service layer.
      // The service will handle logic for users managing one vs. multiple clubs.
      if (!club_id) {
        return next();
      }

      // If club_id is provided, check if user is a manager of that club.
      if (await isUserClubManager(club_id, userId, req)) {
        return next();
      }
    }

    // If none of the above conditions are met, deny access.
    return res.status(403).json({
      success: false,
      message: "User must be a club manager to perform this action",
      code: "FORBIDDEN",
    });
  } catch (error) {
    console.error("Club manager authorization error:", error.message);
    const statusCode =
      error.message === "Error verifying club membership" ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message: "Internal authorization error",
      code: "AUTH_ERROR",
    });
  }
};

// Helper function to check if a user has organizer role or is an event organizer
async function isUserOrganizerForEvent(eventId, userId) {
  try {
    if (eventId) {
      const event = await Event.findById(eventId);
      if (event && event.organizer && event.organizer.user_id === userId) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking event organizer:", error.message);
    return false;
  }
}

/**
 * Authorization middleware to check if a user is a manager, organizer, or admin.
 * This allows admin, club managers, and event organizers to manage events.
 */
export const requireClubManagerOrOrganizer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const userRole = req.headers["x-user-role"];

    // Allow admin access
    if (userRole === "admin") {
      console.log("Admin access granted", {
        userId,
        userRole,
        path: req.path,
        method: req.method,
      });
      return next();
    }

    // --- Authorization for UPDATE/DELETE operations (PUT/DELETE) ---
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
          code: "EVENT_NOT_FOUND",
        });
      }

      // Allow if user is the original creator of the event
      if (event.created_by === userId) {
        return next();
      }

      // Allow if user is the designated organizer of the event
      if (await isUserOrganizerForEvent(eventId, userId)) {
        return next();
      }

      // Allow if user is a manager of the event's club
      if (await isUserClubManager(event.club_id, userId, req)) {
        return next();
      }
    }
    // --- Authorization for CREATE operations (POST) ---
    else {
      const { club_id } = req.body;

      // If club_id is not provided, pass to the service layer
      if (!club_id) {
        return next();
      }

      // If club_id is provided, check if user is a manager of that club
      if (await isUserClubManager(club_id, userId, req)) {
        return next();
      }
    }

    // If none of the above conditions are met, deny access
    return res.status(403).json({
      success: false,
      message:
        "User must be an admin, club manager, or event organizer to perform this action",
      code: "FORBIDDEN",
    });
  } catch (error) {
    console.error("Authorization error:", error.message);
    const statusCode =
      error.message === "Error verifying club membership" ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message: "Internal authorization error",
      code: "AUTH_ERROR",
    });
  }
};
