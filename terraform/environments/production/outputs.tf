output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "alb_dns_name" {
  description = "ALB DNS Name"
  value       = module.alb.alb_dns_name
}

output "alb_url" {
  description = "Application URL"
  value       = "http://${module.alb.alb_dns_name}"
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS Cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS Endpoint"
  value       = module.databases.rds_endpoint
  sensitive   = true
}

output "mq_endpoint" {
  description = "RabbitMQ Endpoint"
  value       = module.databases.mq_endpoint
  sensitive   = true
}

output "mq_console_url" {
  description = "RabbitMQ Management Console URL"
  value       = module.databases.mq_console_url
}

# Bastion Outputs
output "bastion_public_ip" {
  description = "Bastion Host Public IP"
  value       = module.bastion.public_ip
}

output "bastion_ssh_command" {
  description = "SSH command to connect to bastion"
  value       = module.bastion.ssh_command
}

output "bastion_private_key" {
  description = "Bastion private key (save this securely)"
  value       = module.bastion.private_key_pem
  sensitive   = true
}

# ECR Repository URLs
output "ecr_repositories" {
  description = "ECR Repository URLs"
  value = {
    auth     = module.auth_service.ecr_repository_url
    club     = module.club_service.ecr_repository_url
    event    = module.event_service.ecr_repository_url
    image    = module.image_service.ecr_repository_url
    notify   = module.notify_service.ecr_repository_url
    frontend = module.frontend.ecr_repository_url
  }
}

# Service Names
output "service_names" {
  description = "ECS Service Names"
  value = {
    auth     = module.auth_service.service_name
    club     = module.club_service.service_name
    event    = module.event_service.service_name
    image    = module.image_service.service_name
    notify   = module.notify_service.service_name
    frontend = module.frontend.service_name
  }
}
