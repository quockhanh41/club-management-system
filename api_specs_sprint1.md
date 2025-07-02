™¡™£
# ✅ Task Assignment – Club System API (OpenAPI 3.0)

## 👨‍💻 Developers
- **Khải** – Authentication & Authorization
- **Thuận** – User Profile Management
- **Kiệt + Phát** – Club & Event Browsing
- **Khải** – Admin & Account Management

---

## 🔐 Khải – Auth Service (US-001 to US-004)

### US-001 – Register (`POST /api/auth/register`)

```json
{
  "summary": "Register a new user",
  "method": "POST",
  "path": "/api/auth/register",
  "requestBody": {
    "full_name": "string",
    "email": "user@example.com",
    "password": "securePassword"
  },
  "response": {
    "201": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "User Name",
      "role": "USER"
    },
    "400": {
      "status": 400,
      "error": "EMAIL_EXISTS",
      "message": "Email is already registered"
    }
  }
}
```

---

### US-002 – Login (`POST /api/auth/login`)

```json
{
  "summary": "Authenticate user and return JWT",
  "method": "POST",
  "path": "/api/auth/login",
  "requestBody": {
    "email": "user@example.com",
    "password": "securePassword"
  },
  "response": {
    "200": {
      "access_token": "jwt.token.here",
      "expires_in": 3600
    },
    "401": {
      "status": 401,
      "error": "INVALID_CREDENTIALS",
      "message": "Invalid email or password"
    }
  }
}
```

---

### US-003 – Logout (`POST /api/auth/logout`)

```json
{
  "summary": "Logout user",
  "method": "POST",
  "path": "/api/auth/logout",
  "security": "Bearer JWT",
  "response": {
    "204": "Logout successful",
    "401": {
      "status": 401,
      "error": "UNAUTHORIZED",
      "message": "Token missing or invalid"
    }
  }
}
```

---

### US-004 – Forgot Password & Reset Password

**`POST /api/auth/forgot-password`**

```json
{
  "summary": "Send reset link",
  "method": "POST",
  "path": "/api/auth/forgot-password",
  "requestBody": {
    "email": "user@example.com"
  },
  "response": {
    "200": "Reset email sent",
    "400": {
      "status": 400,
      "error": "EMAIL_NOT_FOUND",
      "message": "No user found with this email"
    }
  }
}
```

**`POST /api/auth/reset-password`**

```json
{
  "summary": "Reset password using token",
  "method": "POST",
  "path": "/api/auth/reset-password",
  "requestBody": {
    "token": "secure-reset-token",
    "new_password": "NewPassword123"
  },
  "response": {
    "200": "Password reset successful",
    "400": {
      "status": 400,
      "error": "INVALID_TOKEN",
      "message": "Reset token is invalid or expired"
    }
  }
}
```

---

## 👤 Thuận – User Profile (US-008)

### US-008 – Get / Update Profile (`GET` / `PUT /api/users/me`)

**GET**

```json
{
  "method": "GET",
  "path": "/api/users/me",
  "response": {
    "200": {
      "id": "uuid",
      "full_name": "User Name",
      "email": "user@example.com",
      "avatar_url": "https://example.com/avatar.png",
      "bio": "Student",
      "phone": "0123456789",
      "date_of_birth": "2000-01-01",
      "address": "123 Main St"
    },
    "401": {
      "status": 401,
      "error": "UNAUTHORIZED",
      "message": "Invalid or missing token"
    }
  }
}
```

**PUT**

```json
{
  "method": "PUT",
  "path": "/api/users/me",
  "requestBody": {
    "full_name": "Updated Name",
    "avatar_url": "https://example.com/new-avatar.png",
    "bio": "Updated Bio",
    "phone": "0987654321",
    "date_of_birth": "2000-01-01",
    "address": "New Address"
  },
  "response": {
    "200": "Profile updated successfully",
    "400": {
      "status": 400,
      "error": "VALIDATION_ERROR",
      "message": "Invalid input",
      "details": [
        {
          "field": "phone",
          "message": "Phone number is invalid"
        }
      ]
    },
    "401": {
      "status": 401,
      "error": "UNAUTHORIZED",
      "message": "Token missing or expired"
    }
  }
}
```

---

## 📂 Kiệt + Phát – Club & Event Browsing (US-005, US-006, US-007)

### US-005 – Filter/Search Clubs (`GET /api/clubs`)

```json
{
  "method": "GET",
  "path": "/api/clubs",
  "queryParams": {
    "name": "music",
    "type": "cultural",
    "status": "active",
    "page": 1,
    "limit": 10
  },
  "response": {
    "200": {
      "total": 2,
      "results": [
        {
          "id": "uuid",
          "name": "Music Club",
          "type": "cultural",
          "status": "active",
          "logo_url": "https://example.com/logo.png"
        }
      ]
    }
  }
}
```

---

### US-006 – Filter/Search Events of Club (`GET /api/clubs/{id}/events`)

```json
{
  "method": "GET",
  "path": "/api/clubs/{id}/events",
  "queryParams": {
    "status": "upcoming",
    "start_from": "2025-06-01",
    "start_to": "2025-07-01",
    "page": 1,
    "limit": 10
  },
  "response": {
    "200": {
      "total": 1,
      "results": [
        {
          "id": "uuid",
          "title": "Summer Festival",
          "start_at": "2025-06-20T18:00:00Z",
          "status": "upcoming"
        }
      ]
    },
    "404": {
      "status": 404,
      "error": "CLUB_NOT_FOUND",
      "message": "Club not found"
    }
  }
}
```

---

### US-007 – View Club Info & Recruitments

**`GET /api/clubs/{id}`**

```json
{
  "method": "GET",
  "path": "/api/clubs/{id}",
  "response": {
    "200": {
      "id": "uuid",
      "name": "Tech Club",
      "description": "A club for tech lovers",
      "type": "technical",
      "size": 120,
      "logo_url": "https://example.com/logo.png",
      "website_url": "https://techclub.example.com",
      "status": "active"
    },
    "404": {
      "status": 404,
      "error": "CLUB_NOT_FOUND",
      "message": "Club not found"
    }
  }
}
```

**`GET /api/clubs/{id}/recruitments`**

```json
{
  "method": "GET",
  "path": "/api/clubs/{id}/recruitments",
  "response": {
    "200": [
      {
        "id": "uuid",
        "title": "Spring Recruitment",
        "start_at": "2025-04-10T00:00:00Z",
        "status": "closed"
      }
    ],
    "404": {
      "status": 404,
      "error": "CLUB_NOT_FOUND",
      "message": "Club not found"
    }
  }
}
```

---

## 🛠️ Khải – Admin & Deletion (US-009)

### US-009 – Delete Account (Self / Admin)

**DELETE `/api/users/me`**

```json
{
  "method": "DELETE",
  "path": "/api/users/me",
  "response": {
    "204": "Account deleted",
    "401": {
      "status": 401,
      "error": "UNAUTHORIZED",
      "message": "Token missing or expired"
    }
  }
}
```

**DELETE `/api/admin/users/{id}`**

```json
{
  "method": "DELETE",
  "path": "/api/admin/users/{id}",
  "security": "Bearer JWT (Admin only)",
  "response": {
    "204": "User deleted",
    "403": {
      "status": 403,
      "error": "FORBIDDEN",
      "message": "You are not allowed to perform this action"
    },
    "404": {
      "status": 404,
      "error": "USER_NOT_FOUND",
      "message": "User does not exist"
    }
  }
}
```

---

