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
  #   key            = "production/terraform.tfstate"
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
    }
  }
}

locals {
  common_tags = {
    Project     = "ClubManagementSystem"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
  
  azs = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
}

# ==============================================================================
# VPC Module
# ==============================================================================
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = "${var.environment}-club-vpc"
  cidr = var.vpc_cidr
  
  azs             = local.azs
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway   = true
  single_nat_gateway   = var.single_nat_gateway
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

# ==============================================================================
# IAM Roles
# ==============================================================================
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.environment}-ecs-execution-role"
  
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
# ECS Cluster
# ==============================================================================
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-club-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = local.common_tags
}

# ==============================================================================
# Application Load Balancer
# ==============================================================================
module "alb" {
  source = "../../modules/foundational/alb"
  
  name               = "${var.environment}-club-alb"
  internal           = false
  security_group_ids = [module.alb_sg.security_group_id]
  subnet_ids         = module.vpc.public_subnets
  
  enable_deletion_protection = var.enable_deletion_protection
  enable_http2              = true
  idle_timeout              = 60
  
  default_action_type                   = "fixed-response"
  default_fixed_response_content_type   = "text/plain"
  default_fixed_response_message_body   = "404: Not Found"
  default_fixed_response_status_code    = "404"
  
  tags = local.common_tags
}

# ==============================================================================
# Database Layer
# ==============================================================================
module "databases" {
  source = "../../modules/composition/database-layer"
  
  name_prefix        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  
  allowed_security_group_ids = [module.ecs_tasks_sg.security_group_id]
  
  # RDS Configuration
  rds_instance_class          = var.rds_instance_class
  rds_allocated_storage       = var.rds_allocated_storage
  rds_engine_version          = "15"
  rds_database_name           = "auth_db"
  rds_master_username         = "dbadmin"
  rds_master_password         = var.db_password
  rds_multi_az                = var.rds_multi_az
  rds_backup_retention_period = 7
  rds_skip_final_snapshot     = var.rds_skip_final_snapshot
  
  # Amazon MQ Configuration
  mq_instance_type    = var.mq_instance_type
  mq_deployment_mode  = var.mq_deployment_mode
  mq_admin_username   = "mqadmin"
  mq_admin_password   = var.mq_password
  
  tags = local.common_tags
}

# ==============================================================================
# Microservices
# ==============================================================================

# Auth Service
module "auth_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name     = "auth-service"
  repository_name  = "club-auth-service"
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  container_image  = var.auth_service_image
  container_port   = 3001
  
  cpu           = 256
  memory        = 512
  desired_count = 1
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 10
  listener_rule_path_patterns = ["/api/auth*"]
  health_check_path           = "/"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3001" },
    { name = "DATABASE_URL", value = "postgresql://dbadmin:${var.db_password}@${module.databases.rds_endpoint}/auth_db" },
    { name = "RABBITMQ_URL", value = replace(module.databases.mq_endpoint, "amqps://", "amqps://mqadmin:${var.mq_password}@") },
    { name = "REFRESH_TOKEN_SECRET", value = var.jwt_refresh_secret }
  ]
  
  region = var.aws_region
  tags   = local.common_tags
}

# Club Service
module "club_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name     = "club-service"
  repository_name  = "club-club-service"
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  container_image  = var.club_service_image
  container_port   = 3002
  
  cpu           = 256
  memory        = 512
  desired_count = 1
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 20
  listener_rule_path_patterns = ["/api/clubs*", "/api/campaigns*", "/api/applications*"]
  health_check_path           = "/health"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3002" },
    { name = "MONGODB_URI", value = var.mongodb_uri },
    { name = "RABBITMQ_URL", value = replace(module.databases.mq_endpoint, "amqps://", "amqps://mqadmin:${var.mq_password}@") },
    { name = "AUTH_SERVICE_URL", value = "http://${module.alb.alb_dns_name}/api/auth" },
    { name = "API_GATEWAY_SECRET", value = var.api_gateway_secret }
  ]
  
  region = var.aws_region
  tags   = local.common_tags
}

# Event Service
module "event_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name     = "event-service"
  repository_name  = "club-event-service"
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  container_image  = var.event_service_image
  container_port   = 3003
  
  cpu           = 256
  memory        = 512
  desired_count = 1
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 30
  listener_rule_path_patterns = ["/api/events*"]
  health_check_path           = "/health"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3003" },
    { name = "MONGODB_URI", value = var.mongodb_uri },
    { name = "RABBITMQ_URL", value = replace(module.databases.mq_endpoint, "amqps://", "amqps://mqadmin:${var.mq_password}@") }
  ]
  
  region = var.aws_region
  tags   = local.common_tags
}

# Image Service
module "image_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name     = "image-service"
  repository_name  = "club-image-service"
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  container_image  = var.image_service_image
  container_port   = 3004
  
  cpu           = 256
  memory        = 512
  desired_count = 1
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 40
  listener_rule_path_patterns = ["/api/images*"]
  health_check_path           = "/health"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3004" },
    { name = "RABBITMQ_URL", value = replace(module.databases.mq_endpoint, "amqps://", "amqps://mqadmin:${var.mq_password}@") }
  ]
  
  region = var.aws_region
  tags   = local.common_tags
}

# Notify Service
module "notify_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name     = "notify-service"
  repository_name  = "club-notify-service"
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  container_image  = var.notify_service_image
  container_port   = 3005
  
  cpu           = 256
  memory        = 512
  desired_count = 1
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 50
  listener_rule_path_patterns = ["/api/notifications*"]
  health_check_path           = "/"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3005" },
    { name = "RABBITMQ_URL", value = replace(module.databases.mq_endpoint, "amqps://", "amqps://mqadmin:${var.mq_password}@") },
    { name = "EMAIL_HOST", value = var.email_host },
    { name = "EMAIL_USER", value = var.email_user },
    { name = "EMAIL_PASSWORD", value = var.email_password },
    { name = "EMAIL_FROM", value = var.email_from },
    { name = "EMAIL_SERVICE", value = var.email_service },
    { name = "EMAIL_PORT", value = var.email_port },
    { name = "EMAIL_SECURE", value = var.email_secure }
  ]
  
  region = var.aws_region
  tags   = local.common_tags
}

# Frontend
module "frontend" {
  source = "../../modules/composition/microservice-stack"
  
  service_name     = "frontend"
  repository_name  = "club-frontend"
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  container_image  = var.frontend_image
  container_port   = 3000
  
  cpu           = 512
  memory        = 1024
  desired_count = 1
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 100
  listener_rule_path_patterns = ["/*"]
  health_check_path           = "/"
  health_check_matcher        = "200"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3000" }
  ]
  
  region = var.aws_region
  tags   = local.common_tags
}

# ==============================================================================
# Bastion Host
# ==============================================================================
module "bastion" {
  source = "../../modules/foundational/bastion-host"
  
  name      = "${var.environment}-bastion"
  vpc_id    = module.vpc.vpc_id
  subnet_id = module.vpc.public_subnets[0]
  
  key_name          = "${var.environment}-bastion-key"
  generate_ssh_key  = true
  instance_type     = "t3.micro"
  
  allowed_cidr_blocks = var.bastion_allowed_cidr_blocks
  
  tags = local.common_tags
}
