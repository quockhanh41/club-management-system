const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const logger = require("../config/logger");
const config = require("../config");

class JWTUtil {
  constructor() {
    const jwtConfig = config.getJWTConfig();
    this.algorithm = jwtConfig.algorithm;
    this.accessTokenExpiry = jwtConfig.accessTokenExpiry;
    this.refreshTokenSecret = jwtConfig.refreshTokenSecret;
    this.refreshTokenExpiry = jwtConfig.refreshTokenExpiry;

    // Load RSA keys for access tokens
    try {
      if (jwtConfig.privateKeyContent) {
        this.privateKey = jwtConfig.privateKeyContent.replace(/\\n/g, "\n");
        logger.info("RSA private key loaded from environment variable");
      } else {
        const privateKeyPath = path.resolve(jwtConfig.privateKeyPath);
        this.privateKey = fs.readFileSync(privateKeyPath, "utf8");
        logger.info("RSA private key loaded from file system");
      }

      if (jwtConfig.publicKeyContent) {
        this.publicKey = jwtConfig.publicKeyContent.replace(/\\n/g, "\n");
        logger.info("RSA public key loaded from environment variable");
      } else {
        const publicKeyPath = path.resolve(jwtConfig.publicKeyPath);
        this.publicKey = fs.readFileSync(publicKeyPath, "utf8");
        logger.info("RSA public key loaded from file system");
      }
    } catch (error) {
      logger.error("Failed to load RSA keys:", error);
      throw new Error(
        "RSA keys required for JWT signing. Run: node scripts/generate-keys.js or set JWT_PRIVATE/PUBLIC_KEY_CONTENT env vars"
      );
    }

    if (!this.refreshTokenSecret) {
      throw new Error(
        "Refresh token secret must be defined in environment variables"
      );
    }
  }

  generateAccessToken(payload) {
    try {
      const tokenPayload = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        full_name: payload.full_name,
        type: "access",
      };

      return jwt.sign(tokenPayload, this.privateKey, {
        algorithm: this.algorithm,
        expiresIn: this.accessTokenExpiry,
        issuer: "auth-service",
        audience: "club-management-system",
        header: {
          alg: this.algorithm,
          typ: "JWT",
          kid: "auth-service-key-1", // For Kong JWT plugin key identification
        },
      });
    } catch (error) {
      logger.error("Error generating access token:", error);
      throw new Error("Failed to generate access token");
    }
  }

  generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        id: payload.id,
        email: payload.email,
        type: "refresh",
      };

      return jwt.sign(tokenPayload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: "auth-service",
        audience: "club-management-system",
      });
    } catch (error) {
      logger.error("Error generating refresh token:", error);
      throw new Error("Failed to generate refresh token");
    }
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: [this.algorithm],
        issuer: "auth-service",
        audience: "club-management-system",
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Access token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid access token");
      } else {
        logger.error("Error verifying access token:", error);
        throw new Error("Failed to verify access token");
      }
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: "auth-service",
        audience: "club-management-system",
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Refresh token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid refresh token");
      } else {
        logger.error("Error verifying refresh token:", error);
        throw new Error("Failed to verify refresh token");
      }
    }
  }

  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error("Error decoding token:", error);
      return null;
    }
  }

  getTokenExpirationTime(token) {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.payload && decoded.payload.exp) {
        return new Date(decoded.payload.exp * 1000);
      }
      return null;
    } catch (error) {
      logger.error("Error getting token expiration:", error);
      return null;
    }
  }

  isTokenExpired(token) {
    try {
      const expirationTime = this.getTokenExpirationTime(token);
      if (!expirationTime) return true;

      return new Date() > expirationTime;
    } catch (error) {
      return true;
    }
  }

  generateEmailVerificationToken(userId, email) {
    try {
      const tokenPayload = {
        userId,
        email,
        type: "email_verification",
      };

      return jwt.sign(tokenPayload, this.privateKey, {
        algorithm: this.algorithm,
        expiresIn: "1h", // 1 hour expiration for email verification
        issuer: "auth-service",
        audience: "club-management-system",
      });
    } catch (error) {
      logger.error("Error generating email verification token:", error);
      throw new Error("Failed to generate email verification token");
    }
  }

  verifyEmailVerificationToken(token) {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: [this.algorithm],
        issuer: "auth-service",
        audience: "club-management-system",
      });

      // Ensure this is an email verification token
      if (decoded.type !== "email_verification") {
        throw new Error("Invalid token type");
      }

      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Email verification token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid email verification token");
      } else {
        logger.error("Error verifying email verification token:", error);
        throw new Error("Failed to verify email verification token");
      }
    }
  }

  generateTokenPair(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Get public key for Kong API Gateway
   */
  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Get JWT algorithm
   */
  getAlgorithm() {
    return this.algorithm;
  }

  /**
   * Get JWKS (JSON Web Key Set) for Kong
   */
  getJWKS() {
    const crypto = require("crypto");
    const key = crypto.createPublicKey(this.publicKey);
    const jwk = key.export({ format: "jwk" });

    return {
      keys: [
        {
          ...jwk,
          kid: "auth-service-key-1",
          alg: this.algorithm,
          use: "sig",
        },
      ],
    };
  }
}

module.exports = new JWTUtil();
