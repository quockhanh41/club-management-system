terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = ">= 4.0"
    }
  }
  
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "staging/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "ClubManagementSystem"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Staging"
    }
  }
}

locals {
  common_tags = {
    Project     = "ClubManagementSystem"
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = "Staging"
    Schedule    = "business-hours"  # For Instance Scheduler
  }
  
  azs = ["${var.aws_region}a", "${var.aws_region}b"]  # Only 2 AZs for staging
}

# ==============================================================================
# VPC Module - Optimized for Staging
# ==============================================================================
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = "${var.environment}-club-vpc"
  cidr = var.vpc_cidr
  
  azs             = local.azs
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24"]  # Only 2 AZs
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24"]
  
  enable_nat_gateway   = true
  single_nat_gateway   = true  # Cost saving: Single NAT Gateway
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  public_subnet_tags = {
    Type = "Public"
  }
  
  private_subnet_tags = {
    Type = "Private"
  }
  
  tags = local.common_tags
}

# ==============================================================================
# Security Groups
# ==============================================================================
module "alb_sg" {
  source = "../../modules/foundational/security-group"
  
  name        = "${var.environment}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id
  
  ingress_rules = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP from internet"
    }
  ]
  
  tags = local.common_tags
}

module "ecs_tasks_sg" {
  source = "../../modules/foundational/security-group"
  
  name        = "${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = module.vpc.vpc_id
  
  ingress_rules = [
    {
      from_port                = 3000
      to_port                  = 4000
      protocol                 = "tcp"
      source_security_group_id = module.alb_sg.security_group_id
      description              = "Allow traffic from ALB"
    }
  ]
  
  tags = local.common_tags
}

module "db_sg" {
  source = "../../modules/foundational/security-group"
  
  name        = "${var.environment}-db-sg"
  description = "Security group for databases"
  vpc_id      = module.vpc.vpc_id
  
  ingress_rules = [
    {
      from_port                = 5432
      to_port                  = 5432
      protocol                 = "tcp"
      source_security_group_id = module.ecs_tasks_sg.security_group_id
      description              = "PostgreSQL from ECS tasks"
    },
    {
      from_port                = 5671
      to_port                  = 5672
      protocol                 = "tcp"
      source_security_group_id = module.ecs_tasks_sg.security_group_id
      description              = "RabbitMQ from ECS tasks"
    }
  ]
  
  tags = local.common_tags
}

# ==============================================================================
# Service Discovery Namespace
# ==============================================================================
resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "${var.environment}.club.local"
  vpc  = module.vpc.vpc_id
  
  tags = local.common_tags
}

# ==============================================================================
# Database Layer - Using Staging-Optimized Module
# ==============================================================================
module "databases" {
  source = "../../modules/composition/database-layer-staging"
  
  name_prefix        = "${var.environment}-club"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  aws_region         = var.aws_region
  
  allowed_security_group_ids = [module.ecs_tasks_sg.security_group_id]
  
  # RDS Configuration (Cost-optimized)
  rds_instance_class          = var.rds_instance_class
  rds_allocated_storage       = var.rds_allocated_storage
  rds_master_password         = var.db_password
  rds_backup_retention_period = 1  # Minimal for staging
  
  # RabbitMQ Configuration (Self-hosted for cost saving)
  ecs_cluster_id              = aws_ecs_cluster.main.id
  ecs_execution_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  rabbitmq_admin_password     = var.mq_password
  rabbitmq_cpu                = "256"
  rabbitmq_memory             = "512"
  
  # Service Discovery
  service_discovery_namespace_id = aws_service_discovery_private_dns_namespace.main.id
  
  tags = local.common_tags
}

# ==============================================================================
# ECS Cluster
# ==============================================================================
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-club-cluster"
  
  setting {
    name  = "containerInsights"
    value = "disabled"  # Disable for cost saving in staging
  }
  
  tags = merge(local.common_tags, {
    Schedule = "business-hours"
  })
}

# ==============================================================================
# IAM Roles
# ==============================================================================
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.environment}-club-ecs-task-execution-role"
 
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}
 
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ==============================================================================
# Application Load Balancer - Using Foundational Module
# ==============================================================================
module "alb" {
  source = "../../modules/foundational/alb"
  
  name               = "${var.environment}-club-alb"
  internal           = false
  security_group_ids = [module.alb_sg.security_group_id]
  subnet_ids         = module.vpc.public_subnets
  
  enable_deletion_protection            = false  # Easy cleanup for staging
  enable_http2                          = true
  idle_timeout                          = 60
  
  default_action_type                   = "fixed-response"
  default_fixed_response_content_type   = "text/plain"
  default_fixed_response_message_body   = "Staging Environment - Club Management System"
  default_fixed_response_status_code    = "200"
  
  tags = local.common_tags
}

# ==============================================================================
# CloudWatch Log Groups (Short Retention)
# ==============================================================================
resource "aws_cloudwatch_log_group" "ecs_services" {
  for_each = toset([
    "frontend", "auth", "club", "event", "image", "notify"
  ])
  
  name              = "/ecs/${var.environment}-club-${each.key}"
  retention_in_days = 7  # 7 days for staging (vs 30 for production)
  
  tags = local.common_tags
}

# ==============================================================================
# Auth Service - Using Microservice Stack Module
# ==============================================================================
module "auth_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name     = "auth-service"
  repository_name  = "club-auth-service"
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  container_image  = var.auth_service_image
  container_port   = 3001
  
  # Staging-optimized resources
  cpu           = 256   # Reduced from 512 for staging
  memory        = 512   # Reduced from 1024 for staging
  desired_count = 1     # Single instance for staging
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 100
  listener_rule_path_patterns = ["/api/auth/*"]
  health_check_path           = "/health"
  health_check_interval       = 30
  health_check_timeout        = 5
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  
  environment_variables = [
    { name = "NODE_ENV", value = "staging" },
    { name = "PORT", value = "3001" },
    { name = "DATABASE_URL", value = "postgresql://auth_admin:${var.db_password}@${module.databases.rds_address}:${module.databases.rds_port}/auth_db" },
    { name = "RABBITMQ_URL", value = "amqp://rabbit_admin:${var.mq_password}@rabbitmq.${var.environment}.club.local:5672" },
    { name = "JWT_REFRESH_SECRET", value = var.jwt_refresh_secret },
    { name = "API_GATEWAY_SECRET", value = var.api_gateway_secret },
  ]
  
  log_retention_days = 7  # Short retention for staging
  region             = var.aws_region
  
  tags = merge(
    local.common_tags,
    {
      Service  = "auth"
      Schedule = "business-hours"
    }
  )
}

