variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.1.0.0/16"  # Different from production
}

# Database Variables
variable "db_password" {
  description = "Master password for RDS"
  type        = string
  sensitive   = true
}

variable "mq_password" {
  description = "Password for RabbitMQ"
  type        = string
  sensitive   = true
  default     = "StagingRabbitMQ123!"
}

variable "mongodb_uri" {
  description = "MongoDB Connection URI (Atlas Free Tier)"
  type        = string
  sensitive   = true
  # Default to Atlas free tier connection string
  default = ""
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
  default     = "staging-jwt-refresh-secret-change-me"
}

variable "api_gateway_secret" {
  description = "API Gateway shared secret"
  type        = string
  sensitive   = true
  default     = "staging-api-gateway-secret-change-me"
}

# RDS Configuration (Right-sized for Staging)
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"  # Smallest instance
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20  # Minimum
}

# Email Configuration
variable "email_host" {
  description = "SMTP host"
  type        = string
  default     = "smtp.gmail.com"
}

variable "email_service" {
  description = "Email service provider"
  type        = string
  default     = "gmail"
}

variable "email_port" {
  description = "SMTP port"
  type        = string
  default     = "587"
}

variable "email_secure" {
  description = "Use secure connection"
  type        = string
  default     = "false"
}

variable "email_from" {
  description = "From email address"
  type        = string
  default     = "Club Management Staging <staging@club.com>"
}

variable "email_user" {
  description = "Email username"
  type        = string
  default     = ""
}

variable "email_password" {
  description = "Email password"
  type        = string
  sensitive   = true
  default     = ""
}

# Service Images
variable "auth_service_image" {
  description = "Docker image for auth service"
  type        = string
  default     = "club-auth-service:staging"
}

variable "club_service_image" {
  description = "Docker image for club service"
  type        = string
  default     = "club-club-service:staging"
}

variable "event_service_image" {
  description = "Docker image for event service"
  type        = string
  default     = "club-event-service:staging"
}

variable "image_service_image" {
  description = "Docker image for image service"
  type        = string
  default     = "club-image-service:staging"
}

variable "notify_service_image" {
  description = "Docker image for notify service"
  type        = string
  default     = "club-notify-service:staging"
}

variable "frontend_image" {
  description = "Docker image for frontend"
  type        = string
  default     = "club-frontend:staging"
}

# Cloudinary Configuration
variable "cloudinary_cloud_name" {
  description = "Cloudinary cloud name"
  type        = string
  default     = ""
}

variable "cloudinary_api_key" {
  description = "Cloudinary API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudinary_api_secret" {
  description = "Cloudinary API secret"
  type        = string
  sensitive   = true
  default     = ""
}
