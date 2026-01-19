# ==============================================================================
# Shared Configuration for All Environments
# ==============================================================================

locals {
  # Project metadata
  project_name = "club-management"
  project_full_name = "Club Management System"
  
  # Service ports mapping
  service_ports = {
    auth   = 3001
    club   = 3002
    event  = 3003
    notify = 3004
    image  = 3005
    frontend = 3000
  }
  
  # Container images naming convention
  image_prefix = "club"
  
  # Common resource naming patterns
  naming = {
    vpc_name        = "${local.project_name}-vpc"
    cluster_name    = "${local.project_name}-cluster"
    alb_name        = "${local.project_name}-alb"
  }
  
  # Default resource configurations
  defaults = {
    # ECS Task Defaults (Production)
    ecs_cpu_production    = "512"
    ecs_memory_production = "1024"
    
    # ECS Task Defaults (Staging)
    ecs_cpu_staging       = "256"
    ecs_memory_staging    = "512"
    
    # CloudWatch Log Retention
    log_retention_production = 30  # days
    log_retention_staging    = 7   # days
    
    # Health Check Defaults
    health_check = {
      interval            = 30
      timeout             = 5
      healthy_threshold   = 2
      unhealthy_threshold = 3
      path                = "/health"
      matcher             = "200"
    }
  }
  
  # AWS Regions
  primary_region   = "ap-southeast-1"  # Singapore
  secondary_region = "ap-northeast-1"  # Tokyo (for DR)
  
  # Common tags structure
  tag_keys = [
    "Project",
    "Environment",
    "ManagedBy",
    "Service",
    "CostCenter"
  ]
}

# Output shared configuration for use in environment configs
output "project_name" {
  description = "Project name"
  value       = local.project_name
}

output "service_ports" {
  description = "Service port mappings"
  value       = local.service_ports
}

output "defaults" {
  description = "Default configurations"
  value       = local.defaults
}
