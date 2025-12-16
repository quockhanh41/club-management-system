variable "aws_region" {
  description = "AWS Region to deploy resources"
  type        = string
  default     = "ap-southeast-1" # Singapore
}

variable "environment" {
  description = "Environment name (e.g. dev, prod)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# --- Database Variables ---

variable "db_password" {
  description = "Master password for RDS and DocumentDB"
  type        = string
  sensitive   = true
  # In practice, pass this via -var="db_password=..." or env vars. 
  # Do not default sensitive values in code.
}

variable "mq_password" {
  description = "Password for RabbitMQ user"
  type        = string
  sensitive   = true
  default     = "SecureRabbitMQPass123!" # Example default for terraform plan to work, override in prod
}

variable "mongodb_uri" {
  description = "MongoDB Connection URI (e.g. from MongoDB Atlas)"
  type        = string
  sensitive   = true
  default     = "mongodb+srv://22127188_db_user:CqXqm4HFiPSsCxr3@club.gpfnjhm.mongodb.net/club_management_system?retryWrites=true&w=majority&appName=club-management-system" 
}

variable "jwt_refresh_secret" {
  description = "Secret key for signing refresh tokens"
  type        = string
  sensitive   = true
  default     = "change-this-to-a-secure-random-string-in-production-at-least-32-chars"
}

variable "api_gateway_secret" {
  description = "Shared secret for internal API communication"
  type        = string
  sensitive   = true
  default     = "club-management-api-gateway-secret-key-2024"
}

variable "email_host" {
  description = "SMTP Host"
  type        = string
  default     = "smtp.gmail.com"
}

variable "email_user" {
  description = "SMTP User"
  type        = string
  sensitive   = true
  default     = "hello.univibe@gmail.com"
}

variable "email_password" {
  description = "SMTP Password"
  type        = string
  sensitive   = true
  default     = "cgmi vvma zoqm uoyj" 
}

variable "email_from" {
  description = "Sender Email Address"
  type        = string
  default     = "Club Management System <hello.univibe@gmail.com>"
}

variable "email_service" {
  description = "Email Service Provider"
  type        = string
  default     = "gmail"
}

variable "email_port" {
  description = "SMTP Port"
  type        = string
  default     = "587"
}

variable "email_secure" {
  description = "Use SSL/TLS"
  type        = string
  default     = "false"
}
