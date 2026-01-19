# ==============================================================================
# Staging Environment Configuration - Cost Optimized
# ==============================================================================

# AWS Configuration
aws_region  = "ap-southeast-1"
environment = "staging"

# VPC Configuration
vpc_cidr = "10.1.0.0/16"  # Different from production (10.0.0.0/16)

# RDS Configuration - Minimal for Staging
rds_instance_class    = "db.t3.micro"  # Smallest instance (Free tier eligible)
rds_allocated_storage = 20             # Minimum storage

# Service Images (will be updated by CI/CD)
auth_service_image   = "club-auth-service:staging"
club_service_image   = "club-club-service:staging"
event_service_image  = "club-event-service:staging"
image_service_image  = "club-image-service:staging"
notify_service_image = "club-notify-service:staging"
frontend_image       = "club-frontend:staging"

# Email Configuration (Staging)
email_host    = "smtp.gmail.com"
email_service = "gmail"
email_port    = "587"
email_secure  = "false"
email_from    = "Club Management Staging <staging@club.com>"
email_user    = "hello.univibe@gmail.com"

# ==============================================================================
# SENSITIVE VARIABLES - Use Environment Variables or terraform.tfvars.local
# ==============================================================================
# 
# Create terraform.tfvars.local (gitignored) with:
# 
# db_password          = "staging-db-password"
# mq_password          = "staging-rabbitmq-password"
# mongodb_uri          = "mongodb+srv://user:pass@cluster.mongodb.net/staging_db"
# jwt_refresh_secret   = "staging-jwt-secret"
# api_gateway_secret   = "staging-api-secret"
# email_password       = "app-password"
# cloudinary_cloud_name = "your-cloud-name"
# cloudinary_api_key    = "your-api-key"
# cloudinary_api_secret = "your-api-secret"
#
# Or export as environment variables:
# export TF_VAR_db_password="staging-db-password"
# export TF_VAR_mq_password="staging-rabbitmq-password"
# export TF_VAR_mongodb_uri="mongodb+srv://..."
# export TF_VAR_jwt_refresh_secret="staging-jwt-secret"
# export TF_VAR_api_gateway_secret="staging-api-secret"
# export TF_VAR_email_password="app-password"
# export TF_VAR_cloudinary_cloud_name="your-cloud-name"
# export TF_VAR_cloudinary_api_key="your-api-key"
# export TF_VAR_cloudinary_api_secret="your-api-secret"

# ==============================================================================
# Cost Optimization Notes
# ==============================================================================
#
# 1. Right-sizing Applied:
#    - ECS Tasks: 256 CPU / 512 MB (vs 512/1024 in prod)
#    - RDS: db.t3.micro (smallest)
#    - Single NAT Gateway (vs Multi-AZ in prod)
#    - 2 AZs only (vs 3 in prod)
#
# 2. MongoDB Atlas Free Tier:
#    - M0 cluster: 512 MB storage (FREE)
#    - Shared CPU/RAM
#    - No DocumentDB cost ($53/month saved)
#
# 3. RabbitMQ Self-hosted:
#    - ECS Fargate: ~$7/month
#    - Amazon MQ cost saved: $245/month
#
# 4. CloudWatch Logs:
#    - 7 days retention (vs 30 in prod)
#    - Saves ~$4/month
#
# 5. Scheduler Support:
#    - All resources tagged with Schedule = "business-hours"
#    - Lambda can stop/start based on this tag
#    - Expected savings: 60% of runtime costs
#
# Total Expected Cost: $40-50/month (vs $431 without optimization)
