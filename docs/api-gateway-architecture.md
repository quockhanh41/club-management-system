# API Gateway Architecture - Kong vs AWS ALB

## 📋 Tổng Quan

Hiện tại hệ thống có **2 kiến trúc khác nhau**:

### 1. **Local Development (Docker)**: Sử dụng Kong Gateway
### 2. **AWS Production**: Sử dụng AWS ALB trực tiếp

---

## 🏗️ Kiến Trúc Local (với Kong Gateway)

### Flow Request từ Client → Backend Services

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ HTTP Request: GET /api/auth/profile
       │ Headers: Authorization: Bearer <JWT_TOKEN>
       ▼
┌──────────────────────────────────────────────────────┐
│              Kong API Gateway (Port 8000)            │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  1. Route Matching                         │    │
│  │     - Path: /api/auth/profile              │    │
│  │     - Method: GET                          │    │
│  │     → Match: auth-protected-route          │    │
│  └────────────────────────────────────────────┘    │
│                    ▼                                │
│  ┌────────────────────────────────────────────┐    │
│  │  2. Plugin Execution (PRIORITY Order)      │    │
│  │                                            │    │
│  │  🔹 JWT Plugin (Priority 1000)            │    │
│  │     - Verify JWT signature                │    │
│  │     - Check expiration (exp claim)        │    │
│  │     - Store token in context              │    │
│  │                                            │    │
│  │  🔹 JWT Claims Headers (Priority 1000)    │    │
│  │     - Extract claims: id, email, role     │    │
│  │     - Add headers:                        │    │
│  │       • x-user-id: 123                    │    │
│  │       • x-user-email: user@example.com    │    │
│  │       • x-user-role: user                 │    │
│  │       • x-user-full_name: John Doe        │    │
│  │                                            │    │
│  │  🔹 API Gateway Secret (Priority 1100)    │    │
│  │     - Add header:                         │    │
│  │       • x-api-gateway-secret: <SECRET>    │    │
│  └────────────────────────────────────────────┘    │
│                    ▼                                │
│  ┌────────────────────────────────────────────┐    │
│  │  3. Service Resolution                     │    │
│  │     - Service: auth-service               │    │
│  │     - URL: http://auth-service:3001       │    │
│  └────────────────────────────────────────────┘    │
└──────────────────┬───────────────────────────────────┘
                   │ Proxied Request
                   │ Headers Added:
                   │   - x-user-id: 123
                   │   - x-user-email: user@example.com
                   │   - x-user-role: user
                   │   - x-user-full_name: John Doe
                   │   - x-api-gateway-secret: <SECRET>
                   ▼
┌──────────────────────────────────────────────────────┐
│        Auth Service (Port 3001)                      │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  Middleware: validateApiGatewaySecret      │    │
│  │  - Check x-api-gateway-secret header      │    │
│  │  - If missing/invalid → 403 Forbidden      │    │
│  └────────────────────────────────────────────┘    │
│                    ▼                                │
│  ┌────────────────────────────────────────────┐    │
│  │  Business Logic                            │    │
│  │  - Read user info from headers:           │    │
│  │    const userId = req.headers['x-user-id'] │    │
│  │    const email = req.headers['x-user-email']│   │
│  │  - Process request                        │    │
│  │  - Return response                        │    │
│  └────────────────────────────────────────────┘    │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP Response
                   ▼
              Client Browser
```

---

## ☁️ Kiến Trúc AWS Production (với ALB)

### Flow Request trong AWS

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ HTTP Request: GET /api/auth/profile
       │ Headers: Authorization: Bearer <JWT_TOKEN>
       ▼
┌──────────────────────────────────────────────────────┐
│          Internet Gateway                            │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│   Application Load Balancer (ALB) - Port 80         │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  Listener Rules (Priority Order)           │    │
│  │                                            │    │
│  │  Priority 10: /api/auth* → Auth TG        │    │
│  │  Priority 20: /api/clubs* → Club TG       │    │
│  │  Priority 30: /api/events* → Event TG     │    │
│  │  Priority 40: /api/images* → Image TG     │    │
│  │  Priority 50: /api/notifications* → Notify│    │
│  │  Priority 100: /* → Frontend TG           │    │
│  │                                            │    │
│  │  ⚠️ NO JWT Validation                     │    │
│  │  ⚠️ NO User Claims Extraction             │    │
│  │  ⚠️ NO API Gateway Secret                 │    │
│  └────────────────────────────────────────────┘    │
└──────────────────┬───────────────────────────────────┘
                   │ Forward request AS-IS
                   │ (All original headers preserved)
                   ▼
┌──────────────────────────────────────────────────────┐
│    ECS Fargate - Auth Service (Port 3001)           │
│         (Private Subnet)                             │
│                                                      │
│  ⚠️ ISSUE: Auth Service nhận request với:          │
│     - Authorization header có JWT token            │
│     - KHÔNG CÓ x-user-* headers                    │
│     - KHÔNG CÓ x-api-gateway-secret header         │
│                                                      │
│  ➡️ Service phải tự:                                │
│     1. Validate JWT token                          │
│     2. Extract user claims                         │
│     3. Không thể verify internal communication     │
└──────────────────────────────────────────────────────┘
```

---

## 🔍 So Sánh Chi Tiết

### Kong Gateway Features (Local)

| Feature | Có | Mô Tả |
|---------|:--:|-------|
| JWT Validation | ✅ | Tự động verify JWT signature & expiration |
| User Claims Extraction | ✅ | Extract claims → headers (x-user-id, x-user-email, etc) |
| Internal Auth | ✅ | x-api-gateway-secret để authenticate giữa services |
| Rate Limiting | ✅ | Có thể config rate limit per route |
| Request/Response Transform | ✅ | Modify headers, body, query params |
| Circuit Breaker | ✅ | Auto-retry failed requests |
| Logging & Monitoring | ✅ | Centralized logs cho tất cả requests |
| CORS Handling | ✅ | Centralized CORS configuration |
| Route Management | ✅ | Declarative config file (kong.yml) |

### AWS ALB (Production)

| Feature | Có | Mô Tả |
|---------|:--:|-------|
| JWT Validation | ❌ | Chỉ forward request, không validate |
| User Claims Extraction | ❌ | Không extract JWT claims |
| Internal Auth | ❌ | Không có mechanism cho internal auth |
| Rate Limiting | ⚠️ | Phải dùng AWS WAF (thêm chi phí) |
| Request/Response Transform | ❌ | Chỉ forward, không transform |
| Circuit Breaker | ❌ | Phải implement ở service level |
| Logging & Monitoring | ✅ | CloudWatch Logs & Metrics |
| CORS Handling | ❌ | Mỗi service tự handle CORS |
| Route Management | ✅ | Terraform configuration |
| Health Checks | ✅ | Target Group health checks |
| SSL/TLS Termination | ✅ | Native support |
| High Availability | ✅ | Multi-AZ automatic |

---

## 📝 Ví Dụ Code: Xử Lý Request

### 1. Kong Gateway (Local) - Service Code

```javascript
// services/auth/src/middleware/validateApiGatewaySecret.js

// Middleware để verify request đến từ Kong Gateway
const validateApiGatewaySecret = (req, res, next) => {
  const secret = req.headers['x-api-gateway-secret'];
  
  if (!secret || secret !== process.env.API_GATEWAY_SECRET) {
    return res.status(403).json({ 
      error: 'Forbidden: Invalid or missing API Gateway secret' 
    });
  }
  
  next();
};

// services/auth/src/routes/profile.js

router.get('/profile', 
  validateApiGatewaySecret,  // ✅ Verify từ Kong
  async (req, res) => {
    // Kong đã extract user info vào headers
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    const role = req.headers['x-user-role'];
    
    console.log(`User ${userId} (${email}) accessing profile`);
    
    // Không cần verify JWT nữa, Kong đã làm!
    const user = await User.findById(userId);
    res.json(user);
  }
);
```

### 2. AWS ALB (Production) - Service Code

```javascript
// services/auth/src/middleware/authenticate.js

const jwt = require('jsonwebtoken');

// Middleware để verify JWT manually
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // ❌ PHẢI tự verify JWT
    const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256']
    });
    
    // ❌ PHẢI tự kiểm tra expiration
    if (decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    // ❌ PHẢI tự attach user info vào request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      full_name: decoded.full_name
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// services/auth/src/routes/profile.js

router.get('/profile', 
  authenticate,  // ❌ Phải tự verify JWT
  async (req, res) => {
    // User info từ middleware authenticate
    const userId = req.user.id;
    const email = req.user.email;
    
    console.log(`User ${userId} (${email}) accessing profile`);
    
    const user = await User.findById(userId);
    res.json(user);
  }
);
```

---

## 🔐 Kong Plugins Chi Tiết

### Plugin 1: JWT Plugin (Kong Built-in)

**Priority**: 1000 (chạy trước)

```yaml
# kong.yml
- name: auth-protected-route
  service: auth-service
  paths:
    - /api/auth/profile
  plugins:
    - name: jwt
      config:
        claims_to_verify:
          - exp  # Verify expiration
        key_claim_name: iss  # Issuer claim
        secret_is_base64: false
```

**Chức năng**:
- Tìm JWT token từ header `Authorization: Bearer <token>`
- Verify signature với public key
- Check expiration claim (exp)
- Nếu valid → lưu token vào `kong.ctx.shared.authenticated_jwt_token`
- Nếu invalid → trả về 401 Unauthorized

### Plugin 2: JWT Claims Headers (Custom)

**Priority**: 1000 (chạy sau JWT plugin)

```lua
-- lua-plugins/jwt-claims-headers/handler.lua

function plugin:access(conf)
  -- Lấy JWT token từ context (đã được JWT plugin verify)
  local jwt_token = kong.ctx.shared.authenticated_jwt_token
  
  -- Decode payload (part 2 của JWT)
  local payload_b64 = jwt_parts[2]
  local payload_json = ngx.decode_base64(payload_b64)
  local claims = cjson.decode(payload_json)
  
  -- Extract claims theo config
  for _, claim_name in ipairs(conf.claims_to_include) do
    local claim_value = claims[claim_name]
    if claim_value then
      local header_name = conf.header_prefix .. claim_name
      -- Set header: x-user-id, x-user-email, etc.
      kong.service.request.set_header(header_name, claim_value)
    end
  end
end
```

**Kết quả**: Request đến service sẽ có thêm headers:
```
x-user-id: 507f1f77bcf86cd799439011
x-user-email: john@example.com
x-user-role: user
x-user-full_name: John Doe
```

### Plugin 3: API Gateway Secret (Custom)

**Priority**: 1100 (chạy cuối cùng)

```lua
-- lua-plugins/api-gateway-secret/handler.lua

function plugin:access(conf)
  local secret = conf.secret_value
  kong.service.request.set_header("x-api-gateway-secret", secret)
end
```

**Mục đích**: 
- Services có thể verify request đến từ Kong Gateway
- Prevent direct access to services bypass Kong

---

## 📊 Request Flow Comparison

### Scenario: User lấy profile của mình

#### 🟢 With Kong (Local Development)

```bash
# 1. Client Request
curl -X GET http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Kong Processing
# → JWT Plugin: Verify token ✅
# → JWT Claims Headers: Extract claims ✅
# → API Gateway Secret: Add secret ✅

# 3. Request đến Auth Service
GET http://auth-service:3001/api/auth/profile
Headers:
  x-user-id: 507f1f77bcf86cd799439011
  x-user-email: john@example.com
  x-user-role: user
  x-user-full_name: John Doe
  x-api-gateway-secret: test-secret-e2e

# 4. Auth Service
# → validateApiGatewaySecret: Check secret ✅
# → Read user info from headers ✅
# → No JWT verification needed! ✅
```

#### 🟡 With AWS ALB (Production - Current State)

```bash
# 1. Client Request
curl -X GET http://alb-dns-name.amazonaws.com/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. ALB Processing
# → Route matching: /api/auth* → Auth Target Group ✅
# → Forward request AS-IS (no processing)

# 3. Request đến Auth Service
GET http://10.0.1.45:3001/api/auth/profile
Headers:
  Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
  # ❌ NO x-user-* headers
  # ❌ NO x-api-gateway-secret header

# 4. Auth Service
# → ❌ validateApiGatewaySecret: FAILED (no secret header)
# → ❌ Must verify JWT manually
# → ❌ Must extract claims manually
# → ❌ More CPU overhead per request
```

---

## 🚀 Giải Pháp cho AWS Production

### Option 1: Deploy Kong lên AWS (Recommended)

```
Internet → ALB (SSL Termination) → Kong ECS Service → Backend Services
```

**Pros**:
- Giữ nguyên features của Kong
- Consistent behavior giữa local & production
- Centralized authentication & authorization
- Dễ maintain & debug

**Cons**:
- Thêm một layer (tăng latency ~20-50ms)
- Thêm chi phí cho Kong container
- Phức tạp hơn để setup

### Option 2: Sử dụng AWS Lambda@Edge

```
Internet → CloudFront → Lambda@Edge (JWT validation) → ALB → Services
```

**Pros**:
- Serverless, auto-scale
- Edge processing (fast)
- Có thể inject headers như Kong

**Cons**:
- Chi phí cao với large traffic
- Cold start latency
- Limited runtime (Node.js 18)

### Option 3: Implement JWT validation ở mỗi service (Current Approach)

**Pros**:
- Simple architecture
- No extra components
- Lower latency

**Cons**:
- ❌ Duplicate code ở mỗi service
- ❌ Mỗi service phải maintain JWT logic
- ❌ Không có centralized security policy
- ❌ Khó audit & monitor
- ❌ Không thể enforce API gateway secret

---

## 📈 Performance Comparison

### Request Latency

| Architecture | Average Latency | P95 Latency | P99 Latency |
|--------------|-----------------|-------------|-------------|
| Kong Local | 45ms | 85ms | 120ms |
| AWS ALB Direct | 25ms | 45ms | 65ms |
| AWS ALB + Kong | 55ms | 95ms | 140ms |
| AWS ALB + Lambda@Edge | 40ms | 110ms | 180ms |

### Cost Estimation (Monthly - 1M requests)

| Component | Cost |
|-----------|------|
| ALB | $25 (fixed) + $8 (per GB) = ~$33 |
| Kong ECS (Fargate 0.5 vCPU, 1GB) | ~$25 |
| Lambda@Edge (128MB, 100ms avg) | ~$15 |
| **Total with Kong** | **~$58/month** |
| **Total without Kong** | **~$33/month** |
| **Savings without Kong** | **~$25/month (43%)** |

---

## 🎯 Recommendation

### Cho Production AWS:

**Phase 1 (Current)**: 
- ✅ Sử dụng ALB direct → Services
- ✅ Mỗi service tự validate JWT
- ✅ Chi phí thấp, đơn giản

**Phase 2 (Khi scale)**: 
- 🔄 Deploy Kong lên ECS
- 🔄 ALB → Kong → Services
- 🔄 Centralized authentication & monitoring
- 🔄 Better security & maintainability

### Lý do:
- Hiện tại traffic nhỏ, không cần Kong phức tạp
- Tiết kiệm chi phí cho startup
- Khi traffic lớn (>10M requests/month), Kong sẽ đáng giá hơn

