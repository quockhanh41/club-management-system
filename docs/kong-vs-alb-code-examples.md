# Kong Gateway vs AWS ALB - Code Examples

## 📋 Overview

Tài liệu này cung cấp các ví dụ code thực tế để so sánh cách implement với Kong Gateway và AWS ALB.

---

## 🔧 Kong Configuration

### 1. kong.yml - Route & Plugin Configuration

```yaml
_format_version: "3.0"

services:
  # Auth Service definition
  - name: auth-service
    url: http://auth-service:3001
    tags: [club-management-system, auth]
    plugins:
      # Plugin này chạy cho TẤT CẢ routes của auth-service
      - name: api-gateway-secret
        config:
          secret_value: ${API_GATEWAY_SECRET}

routes:
  # Public routes - Không cần JWT
  - name: auth-public-route
    service: auth-service
    paths:
      - /api/auth/login
      - /api/auth/register
      - /api/auth/verify-email
      - /api/auth/forgot-password
      - /api/auth/reset-password
      - /api/auth/refresh
    methods: [GET, POST, PUT, DELETE, OPTIONS]
    strip_path: false
    tags: [auth, public]
    # NO JWT plugin → Anyone can access
    
  # Protected routes - Cần JWT
  - name: auth-protected-route
    service: auth-service
    paths:
      - /api/auth/profile
      - /api/auth/change-password
      - /api/auth/logout
      - /api/auth/me
    methods: [GET, POST, PUT, DELETE, OPTIONS]
    strip_path: false
    tags: [auth, protected]
    plugins:
      # Plugin 1: Verify JWT
      - name: jwt
        tags: [auth-jwt]
        config:
          claims_to_verify:
            - exp  # Check expiration
          key_claim_name: iss  # Issuer claim
          secret_is_base64: false
      
      # Plugin 2: Extract JWT claims → headers
      - name: jwt-claims-headers
        tags: [auth-claims]
        config:
          claims_to_include:
            - id
            - email
            - role
            - full_name
          header_prefix: "x-user-"
```

### 2. Custom Lua Plugin - JWT Claims Headers

```lua
-- lua-plugins/jwt-claims-headers/handler.lua

local plugin = {
  PRIORITY = 1000,  -- Execute after JWT plugin
  VERSION = "1.0.0",
}

function plugin:access(conf)
  -- Skip for OPTIONS (CORS preflight)
  if kong.request.get_method() == "OPTIONS" then
    return
  end

  kong.log.debug("=== JWT Claims Headers Plugin ===")
  
  local jwt_claims = nil

  -- Get JWT token from context (set by JWT plugin)
  if kong.ctx.shared and kong.ctx.shared.authenticated_jwt_token then
    local jwt_token = kong.ctx.shared.authenticated_jwt_token
    
    -- Split JWT into parts: header.payload.signature
    local jwt_parts = {}
    for part in string.gmatch(jwt_token, "([^%.]+)") do
      table.insert(jwt_parts, part)
    end
    
    if #jwt_parts >= 2 then
      -- Get payload (second part)
      local payload_b64 = jwt_parts[2]
      
      -- Add base64 padding if needed
      local padding = 4 - (string.len(payload_b64) % 4)
      if padding ~= 4 then
        payload_b64 = payload_b64 .. string.rep("=", padding)
      end
      
      -- Decode base64
      local payload_json = ngx.decode_base64(payload_b64)
      
      if payload_json then
        -- Parse JSON
        local cjson = require("cjson")
        local success, parsed_claims = pcall(cjson.decode, payload_json)
        
        if success and parsed_claims then
          jwt_claims = parsed_claims
          kong.log.debug("Successfully parsed JWT claims")
        end
      end
    end
  end
  
  -- If we have claims, add them as headers
  if jwt_claims then
    for _, claim_name in ipairs(conf.claims_to_include) do
      local claim_value = jwt_claims[claim_name]
      
      if claim_value then
        local header_name = conf.header_prefix .. claim_name
        
        -- Convert to string if not already
        if type(claim_value) == "table" then
          claim_value = cjson.encode(claim_value)
        else
          claim_value = tostring(claim_value)
        end
        
        -- Set header on request to upstream service
        kong.service.request.set_header(header_name, claim_value)
        kong.log.debug("Set header: " .. header_name .. " = " .. claim_value)
      end
    end
  else
    kong.log.warn("No JWT claims found in context")
  end
end

return plugin
```

### 3. Custom Lua Plugin - API Gateway Secret

```lua
-- lua-plugins/api-gateway-secret/handler.lua

local plugin = {
  PRIORITY = 1100,  -- Execute last
  VERSION = "1.0.0",
}

function plugin:access(conf)
  -- Skip for OPTIONS (CORS preflight)
  if kong.request.get_method() == "OPTIONS" then
    return
  end

  kong.log.debug("=== API Gateway Secret Plugin ===")
  
  local secret = conf.secret_value
  
  -- Add secret header to upstream request
  kong.service.request.set_header("x-api-gateway-secret", secret)
  kong.log.debug("Set header: x-api-gateway-secret = " .. secret)
end

return plugin
```

---

## 🔐 Service Code - Auth Service

### With Kong (Local Development)

```javascript
// services/auth/src/middleware/validateApiGatewaySecret.js

/**
 * Middleware to validate that request came through Kong Gateway
 * by checking the x-api-gateway-secret header
 */
const validateApiGatewaySecret = (req, res, next) => {
  const secret = req.headers['x-api-gateway-secret'];
  const expectedSecret = process.env.API_GATEWAY_SECRET;
  
  if (!secret) {
    console.error('Missing API Gateway secret header');
    return res.status(403).json({ 
      error: 'Forbidden: Missing API Gateway secret',
      message: 'This endpoint must be accessed through the API Gateway'
    });
  }
  
  if (secret !== expectedSecret) {
    console.error('Invalid API Gateway secret');
    return res.status(403).json({ 
      error: 'Forbidden: Invalid API Gateway secret',
      message: 'Authentication failed'
    });
  }
  
  // Secret is valid - request came from Kong
  next();
};

module.exports = validateApiGatewaySecret;
```

```javascript
// services/auth/src/routes/profile.js

const express = require('express');
const router = express.Router();
const validateApiGatewaySecret = require('../middleware/validateApiGatewaySecret');

/**
 * GET /api/auth/profile
 * 
 * With Kong:
 * 1. Kong verifies JWT
 * 2. Kong extracts claims → headers
 * 3. Kong adds API Gateway secret
 * 4. Service just reads headers!
 */
router.get('/profile', 
  validateApiGatewaySecret,  // ✅ Verify from Kong
  async (req, res) => {
    try {
      // Kong already extracted user info into headers
      const userId = req.headers['x-user-id'];
      const email = req.headers['x-user-email'];
      const role = req.headers['x-user-role'];
      const fullName = req.headers['x-user-full_name'];
      
      console.log(`User ${userId} (${email}) accessing profile`);
      
      // ✅ NO JWT verification needed!
      // ✅ NO token parsing needed!
      // ✅ Kong already did all the work!
      
      // Just fetch user data
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      });
      
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
```

### Without Kong (AWS ALB - Production)

```javascript
// services/auth/src/middleware/authenticate.js

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

/**
 * Middleware to manually verify JWT when NOT using Kong
 * (Used in AWS with ALB direct routing)
 */
const authenticate = async (req, res, next) => {
  try {
    // ❌ Step 1: Extract token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No token provided' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // ❌ Step 2: Load public key
    const publicKeyPath = path.join(__dirname, '../../keys/public.pem');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    
    // ❌ Step 3: Verify JWT signature
    // This is CPU intensive (RSA verification)
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'auth-service'
    });
    
    // ❌ Step 4: Check expiration manually
    if (decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token expired' 
      });
    }
    
    // ❌ Step 5: Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      full_name: decoded.full_name,
      iss: decoded.iss,
      exp: decoded.exp
    };
    
    // ⚠️ Every service has to duplicate this entire logic!
    next();
    
  } catch (error) {
    console.error('JWT verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid token' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Authentication failed' 
    });
  }
};

module.exports = authenticate;
```

```javascript
// services/auth/src/routes/profile.js

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

/**
 * GET /api/auth/profile
 * 
 * Without Kong (AWS ALB):
 * 1. ALB just routes request
 * 2. Service must verify JWT
 * 3. Service must extract claims
 * 4. Much more work!
 */
router.get('/profile', 
  authenticate,  // ❌ Must manually verify JWT
  async (req, res) => {
    try {
      // User info from authenticate middleware
      const userId = req.user.id;
      const email = req.user.email;
      
      console.log(`User ${userId} (${email}) accessing profile`);
      
      // ❌ We had to verify JWT ourselves
      // ❌ More CPU overhead per request
      // ❌ Same code duplicated in every service
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      });
      
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
```

---

## 🔄 Service to Service Communication

### Scenario: Club Service calls Auth Service to verify user

#### With Kong (Internal Communication)

```javascript
// services/club/src/utils/authClient.js

const axios = require('axios');

/**
 * Call Auth Service through Kong
 * Kong will add API Gateway secret automatically
 */
const verifyUser = async (userId) => {
  try {
    // Call through Kong gateway
    const response = await axios.get(
      `http://kong:8000/api/auth/users/${userId}`,
      {
        headers: {
          // Kong's api-gateway-secret plugin will add the secret
          // No need to add manually
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to verify user:', error);
    throw error;
  }
};

module.exports = { verifyUser };
```

```javascript
// services/auth/src/routes/users.js

const express = require('express');
const router = express.Router();
const validateApiGatewaySecret = require('../middleware/validateApiGatewaySecret');

/**
 * Internal endpoint for service-to-service communication
 * Only accessible through Kong
 */
router.get('/users/:id',
  validateApiGatewaySecret,  // ✅ Only Kong can call this
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

#### Without Kong (AWS - Service Discovery)

```javascript
// services/club/src/utils/authClient.js

const axios = require('axios');

/**
 * Call Auth Service directly via ALB in AWS
 * Problem: No way to verify this is internal call!
 */
const verifyUser = async (userId) => {
  try {
    // Call through ALB (internal DNS)
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 
                          'http://alb-internal-dns/api/auth';
    
    const response = await axios.get(
      `${authServiceUrl}/users/${userId}`,
      {
        headers: {
          // ❌ No API Gateway secret to add
          // ❌ Anyone can call this if they know the URL
          // ⚠️ Must rely on VPC security groups only
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to verify user:', error);
    throw error;
  }
};

module.exports = { verifyUser };
```

---

## 📊 Performance Comparison

### Kong Implementation

```javascript
// Simplified performance analysis

// Request flow:
// Client → Kong (45ms) → Service (20ms) = 65ms total

// Kong processing (45ms):
// - Route matching: 2ms
// - JWT verification: 15ms (RSA)
// - Claims extraction: 5ms
// - Secret injection: 1ms
// - Proxy: 2ms
// - Total: 25ms + network (20ms)

// Service processing (20ms):
// - Validate secret: 1ms
// - Read headers: <1ms
// - Business logic: 15ms
// - DB query: 3ms
```

### ALB Implementation

```javascript
// Simplified performance analysis

// Request flow:
// Client → ALB (25ms) → Service (35ms) = 60ms total

// ALB processing (25ms):
// - Route matching: 5ms
// - Health check: 3ms
// - Forward: 3ms
// - Network: 14ms

// Service processing (35ms):
// - JWT verification: 15ms (RSA) ❌
// - Claims extraction: 2ms ❌
// - Business logic: 15ms
// - DB query: 3ms

// ⚠️ Problem: JWT verification happens in EVERY service!
// If you have 5 services, that's 5x the CPU overhead
```

### Cost Analysis

```javascript
// Monthly cost estimation (1 million requests)

// With Kong on AWS:
const kongCost = {
  alb: 33,           // $33 for ALB
  kongEcs: 25,       // $25 for Kong Fargate container
  total: 58          // $58 total
};

// Without Kong (ALB direct):
const albOnlyCost = {
  alb: 33,           // $33 for ALB
  total: 33          // $33 total
};

// Savings: $25/month without Kong
// But you lose:
// - Centralized JWT validation
// - API Gateway secret
// - Rate limiting
// - Request transformation
// - Consistent security policy

// Recommendation:
// - Start without Kong (save money)
// - Add Kong when traffic > 10M requests/month
// - Or when you need advanced API Gateway features
```

---

## 🎯 Best Practices

### When to use Kong

✅ **Use Kong when:**
- Multiple microservices need authentication
- Need centralized security policy
- Want consistent behavior local & production
- Need rate limiting, circuit breaker, etc.
- Traffic > 10M requests/month

❌ **Skip Kong when:**
- Single service / monolith
- Very low traffic (<1M requests/month)
- Cost is critical concern
- Simple routing is enough

### Security Checklist

#### With Kong:
```javascript
✅ JWT validation centralized
✅ API Gateway secret protects internal calls
✅ Consistent authentication logic
✅ Easy to audit all requests
✅ Rate limiting available
```

#### Without Kong (AWS ALB):
```javascript
⚠️ Each service must validate JWT
⚠️ No internal communication protection
⚠️ Must rely on VPC security groups
⚠️ Code duplication across services
✅ Simpler architecture
✅ Lower cost
✅ Native AWS integration
```

---

## 📚 References

- Kong Gateway Documentation: https://docs.konghq.com/gateway/latest/
- AWS ALB Documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/
- JWT RFC: https://tools.ietf.org/html/rfc7519
- RS256 Algorithm: https://en.wikipedia.org/wiki/RSA_(cryptosystem)

