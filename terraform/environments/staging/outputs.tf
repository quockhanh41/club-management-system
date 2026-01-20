# ==============================================================================
# Staging Environment Outputs
# ==============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "alb_dns_name" {
  description = "ALB DNS name - Use this to access the staging environment"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "ALB zone ID for Route53"
  value       = module.alb.alb_zone_id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.databases.rds_endpoint
  sensitive   = true
}

output "rds_connection_string" {
  description = "RDS connection string"
  value       = "postgresql://auth_admin:***@${module.databases.rds_endpoint}/auth_db"
  sensitive   = true
}

output "rabbitmq_endpoint" {
  description = "RabbitMQ endpoint (internal DNS)"
  value       = module.databases.rabbitmq_endpoint
  sensitive   = true
}

output "rabbitmq_management_url" {
  description = "RabbitMQ Management UI (internal)"
  value       = "http://rabbitmq.${var.environment}.club.local:15672"
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "service_discovery_namespace" {
  description = "Service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

# Security Groups
output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = module.alb_sg.security_group_id
}

output "ecs_tasks_security_group_id" {
  description = "ECS tasks security group ID"
  value       = module.ecs_tasks_sg.security_group_id
}

output "db_security_group_id" {
  description = "Database security group ID"
  value       = module.db_sg.security_group_id
}

# Cost Optimization Info
output "cost_optimization_tags" {
  description = "Resources are tagged for cost optimization"
  value = {
    schedule        = "business-hours"
    environment     = var.environment
    cost_center     = "Staging"
    auto_shutdown   = "enabled"
  }
}

output "access_instructions" {
  description = "How to access the staging environment"
  value = <<-EOT
    Staging Environment Access:
    
    1. Frontend: http://${module.alb.alb_dns_name}
    2. Auth API: http://${module.alb.alb_dns_name}/api/auth
    3. Club API: http://${module.alb.alb_dns_name}/api/club
    4. Event API: http://${module.alb.alb_dns_name}/api/event
    
    Database (via Bastion):
    - Host: ${module.databases.rds_endpoint}
    - Database: auth_db
    - Username: auth_admin
    
    RabbitMQ Management (internal):
    - URL: http://rabbitmq.staging.club.local:15672
    - Username: rabbit_admin
    
    MongoDB:
    - Use MongoDB Atlas connection string
    
    Note: This environment runs on business hours schedule (7 AM - 7 PM Mon-Fri)
  EOT
}

# Commented out as scheduler.tf is disabled
# output "scheduler_configuration" {
#   description = "Scheduler configuration for Lambda function"
#   value = {
#     ecs_cluster_name = aws_ecs_cluster.main.name
#     ecs_services = [
#       module.auth_service.service_name
#     ]
#     rds_instance_id = module.databases.rds_instance_id
#     schedule_tag    = "business-hours"
#   }
# }
