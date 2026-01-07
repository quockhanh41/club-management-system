variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "single_nat_gateway" {
  description = "Use single NAT Gateway (cost saving)"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable ALB deletion protection"
  type        = bool
  default     = false
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
}

variable "mongodb_uri" {
  description = "MongoDB Connection URI"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
}

variable "api_gateway_secret" {
  description = "API Gateway shared secret"
  type        = string
  sensitive   = true
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = false
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot on RDS deletion"
  type        = bool
  default     = true
}

# Amazon MQ Configuration
variable "mq_instance_type" {
  description = "Amazon MQ instance type"
  type        = string
  default     = "mq.t3.micro"
}

variable "mq_deployment_mode" {
  description = "Amazon MQ deployment mode"
  type        = string
  default     = "SINGLE_INSTANCE"
}

# Email Configuration
variable "email_host" {
  description = "SMTP Host"
  type        = string
  default     = "smtp.gmail.com"
}

variable "email_user" {
  description = "SMTP User"
  type        = string
  sensitive   = true
}

variable "email_password" {
  description = "SMTP Password"
  type        = string
  sensitive   = true
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

# Service Images
variable "auth_service_image" {
  description = "Docker image for auth service"
  type        = string
  default     = "club-auth-service:latest"
}

variable "club_service_image" {
  description = "Docker image for club service"
  type        = string
  default     = "club-club-service:latest"
}

variable "event_service_image" {
  description = "Docker image for event service"
  type        = string
  default     = "club-event-service:latest"
}

variable "image_service_image" {
  description = "Docker image for image service"
  type        = string
  default     = "club-image-service:latest"
}

variable "notify_service_image" {
  description = "Docker image for notify service"
  type        = string
  default     = "club-notify-service:latest"
}

variable "frontend_image" {
  description = "Docker image for frontend"
  type        = string
  default     = "club-frontend:latest"
}

# Bastion Configuration
variable "bastion_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to SSH to bastion"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
