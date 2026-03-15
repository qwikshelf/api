# Security Plan: Protecting Swagger & Adminer

This document outlines the strategy for securing sensitive administrative tools (Swagger API Documentation and Adminer Database Manager) in the production environment.

## Objective
Prevent unauthorized access to database management and detailed API specifications while maintaining developer accessibility from any location.

## Proposed Architecture: Layered Security

### 1. Primary Layer: ID / Password (HTTP Basic Auth)
Instead of relying solely on IP addresses (which change), we will use HTTP Basic Authentication. This provides a native browser login popup before any tool content is served.

#### Implementation for Adminer (Nginx)
Adminer sits behind the Nginx reverse proxy. We will use Nginx's `auth_basic` module.
- **Credential Storage**: A `.htpasswd` file on the server containing hashed credentials.
- **Nginx Rule**:
  ```nginx
  location /adminer {
      auth_basic "Restricted Admin Area";
      auth_basic_user_file /etc/nginx/.htpasswd;
      proxy_pass http://adminer:8080;
  }
  ```

#### Implementation for Swagger (Go / Gin)
Swagger is served directly by the Go API. We will use the built-in Gin `BasicAuth` middleware for the swagger route group.
- **Gin Middleware**:
  ```go
  authorized := r.Group("/swagger", gin.BasicAuth(gin.Accounts{
      "admin": "your_secure_password",
  }))
  authorized.GET("/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
  ```

### 2. Secondary Layer: IP Whitelisting (Optional Fallback)
For added security, we can combine Basic Auth with IP whitelisting for known static locations (Office/VPN).
- **Pros**: Reduces brute-force attempts.
- **Cons**: Requires maintenance when IPs change.

## Pros & Cons of ID/Password Approach

| Pros | Cons |
| :--- | :--- |
| **High Mobility**: Access tools from home, office, or travel without config changes. | **Brute Force Risk**: The login page is visible to the public internet (though protected). |
| **Standard Security**: Industry-standard protection for internal tools. | **Credential Management**: Must securely store and share the "Internal Tool" password. |
| **No App Code (Nginx)**: Adminer protection is handled entirely at the infra level. | |

## Next Steps
When ready to implement:
1. Generate `.htpasswd` file for Nginx.
2. Update `internal/adapter/primary/http/router/router.go` to wrap Swagger routes in BasicAuth.
3. Update production Nginx configuration templates.

---
**Status**: Pending Implementation (Wait for User Green Light)
