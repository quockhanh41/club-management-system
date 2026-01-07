# AWS Configuration
aws_region  = "ap-southeast-1"
environment = "production"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
single_nat_gateway = true  # Set to false for HA in production

# ALB Configuration
enable_deletion_protection = false  # Set to true in production

# RDS Configuration
rds_instance_class      = "db.t3.micro"
rds_allocated_storage   = 20
rds_multi_az            = false  # Set to true for HA in production
rds_skip_final_snapshot = true   # Set to false in production

# Amazon MQ Configuration
mq_instance_type   = "mq.t3.micro"
mq_deployment_mode = "SINGLE_INSTANCE"  # Use "ACTIVE_STANDBY_MULTI_AZ" for HA

# Email Configuration
email_host    = "smtp.gmail.com"
email_service = "gmail"
email_port    = "587"
email_secure  = "false"
email_from    = "Club Management System <hello.univibe@gmail.com>"
email_user    = "hello.univibe@gmail.com"

# Bastion Configuration
bastion_allowed_cidr_blocks = ["0.0.0.0/0"]  # Restrict to your IP in production

# Service Images (will use ECR URLs after first push)
auth_service_image   = "club-auth-service:latest"
club_service_image   = "club-club-service:latest"
event_service_image  = "club-event-service:latest"
image_service_image  = "club-image-service:latest"
notify_service_image = "club-notify-service:latest"
frontend_image       = "club-frontend:latest"

# ==============================================================================
# SENSITIVE VARIABLES - Pass via environment variables or terraform.tfvars.local
# ==============================================================================
# Export these as environment variables:
# export TF_VAR_db_password="your-secure-password"
# export TF_VAR_mq_password="your-secure-password"
# export TF_VAR_mongodb_uri="mongodb+srv://user:pass@cluster.mongodb.net/db"
# export TF_VAR_jwt_refresh_secret="your-jwt-secret"
# export TF_VAR_api_gateway_secret="your-api-gateway-secret"
# export TF_VAR_email_password="your-email-app-password"

# Or create terraform.tfvars.local (gitignored):
# db_password          = "secure-password-here"
# mq_password          = "secure-password-here"
# mongodb_uri          = "mongodb+srv://..."
# jwt_refresh_secret   = "secure-jwt-secret"
# api_gateway_secret   = "secure-api-secret"
# email_password       = "app-password-here"
