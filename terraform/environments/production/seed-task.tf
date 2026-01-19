# ===============================================
# ECS TASK FOR DATABASE SEEDING - PRODUCTION
# MANUAL TRIGGER ONLY - NOT AUTO-RUN
# ===============================================

# ECR Repository for seed scripts Docker image
resource "aws_ecr_repository" "seed_scripts" {
  name                 = "${var.environment}-club-management-seed-scripts"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false # Not needed for one-time scripts
  }

  tags = merge(
    local.common_tags,
    {
      Name        = "${var.environment}-seed-scripts-repo"
      Description = "Container repository for database seeding scripts"
    }
  )
}

# IAM Role for Seed Task Execution
resource "aws_iam_role" "seed_task_execution_role" {
  name = "${var.environment}-club-management-seed-execution-role"

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

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "seed_task_execution_policy" {
  role       = aws_iam_role.seed_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for Seed Task (Runtime)
resource "aws_iam_role" "seed_task_role" {
  name = "${var.environment}-club-management-seed-task-role"

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

# CloudWatch Log Group for Seed Task
resource "aws_cloudwatch_log_group" "seed_task" {
  name              = "/ecs/${var.environment}-club-management-seed"
  retention_in_days = 30 # Longer retention for production

  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-seed-task-logs"
    }
  )
}

# ECS Task Definition for Database Seeding
resource "aws_ecs_task_definition" "seed_task" {
  family                   = "${var.environment}-club-management-seed-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"  # 0.5 vCPU - sufficient for seed scripts
  memory                   = "1024" # 1 GB - needed for processing data
  execution_role_arn       = aws_iam_role.seed_task_execution_role.arn
  task_role_arn            = aws_iam_role.seed_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "seed-scripts"
      image     = "${aws_ecr_repository.seed_scripts.repository_url}:latest"
      essential = true

      environment = [
        # PostgreSQL Configuration (for Auth service)
        {
          name  = "DB_HOST"
          value = split(":", module.databases.rds_endpoint)[0]
        },
        {
          name  = "DB_PORT"
          value = "5432"
        },
        {
          name  = "DB_USER"
          value = "dbadmin"
        },
        {
          name  = "DB_NAME"
          value = "auth_db"
        },
        # MongoDB Configuration (for Club & Event services)
        {
          name  = "MONGODB_URI"
          value = var.mongodb_uri
        },
        {
          name  = "CLUB_MONGODB_URI"
          value = var.mongodb_uri
        },
        {
          name  = "EVENT_MONGODB_URI"
          value = var.mongodb_uri
        },
        # Cloudinary Configuration (optional)
        {
          name  = "CLOUDINARY_CLOUD_NAME"
          value = var.cloudinary_cloud_name != "" ? var.cloudinary_cloud_name : "djupm4v0l"
        },
        {
          name  = "CLOUDINARY_API_KEY"
          value = var.cloudinary_api_key != "" ? var.cloudinary_api_key : "placeholder"
        },
        # Seeding Configuration
        {
          name  = "SEED_BATCH_SIZE"
          value = "100"
        },
        {
          name  = "SEED_TIMEOUT_SECONDS"
          value = "600"
        },
        {
          name  = "LOG_LEVEL"
          value = "INFO"
        },
        {
          name  = "USE_REAL_IMAGES"
          value = "false"
        },
        {
          name  = "USE_PLACEHOLDER_SERVICE"
          value = "true"
        }
      ]

      secrets = [
        # Sensitive values from SSM Parameter Store
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_ssm_parameter.db_password.arn
        },
        {
          name      = "CLOUDINARY_API_SECRET"
          valueFrom = aws_ssm_parameter.cloudinary_secret.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.seed_task.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "seed"
        }
      }

      # Health check not needed for one-time task
    }
  ])

  tags = merge(
    local.common_tags,
    {
      Name        = "${var.environment}-seed-task"
      Description = "Manual task to seed production databases"
    }
  )
}

# SSM Parameters for Secrets (if not already exists)
resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.environment}/club-management/db_password"
  description = "Database password for RDS PostgreSQL"
  type        = "SecureString"
  value       = var.db_password

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value] # Don't update if manually changed
  }
}

resource "aws_ssm_parameter" "cloudinary_secret" {
  name        = "/${var.environment}/club-management/cloudinary_secret"
  description = "Cloudinary API secret"
  type        = "SecureString"
  value       = var.cloudinary_api_secret != "" ? var.cloudinary_api_secret : "placeholder"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

# Grant ECS Task Execution Role access to SSM parameters
resource "aws_iam_role_policy" "seed_task_execution_ssm" {
  name = "${var.environment}-club-management-seed-ssm-policy"
  role = aws_iam_role.seed_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = [
          aws_ssm_parameter.db_password.arn,
          aws_ssm_parameter.cloudinary_secret.arn
        ]
      }
    ]
  })
}

# ===============================================
# OUTPUTS
# ===============================================

output "seed_ecr_repository_url" {
  description = "ECR repository URL for seed scripts image"
  value       = aws_ecr_repository.seed_scripts.repository_url
}

output "seed_task_definition_arn" {
  description = "ARN of the seed task definition"
  value       = aws_ecs_task_definition.seed_task.arn
}

output "seed_task_family" {
  description = "Family name of the seed task"
  value       = aws_ecs_task_definition.seed_task.family
}

output "seed_task_commands" {
  description = "Commands to run the seed task manually"
  value       = <<-EOF
    # Build and push seed scripts image:
    cd database_script
    docker build --platform linux/amd64 -t ${aws_ecr_repository.seed_scripts.repository_url}:latest .
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.seed_scripts.repository_url}
    docker push ${aws_ecr_repository.seed_scripts.repository_url}:latest
    
    # Run seed task:
    aws ecs run-task \
      --cluster ${aws_ecs_cluster.main.name} \
      --task-definition ${aws_ecs_task_definition.seed_task.family} \
      --launch-type FARGATE \
      --network-configuration "awsvpcConfiguration={subnets=[${module.vpc.private_subnets[0]}],securityGroups=[${module.ecs_tasks_sg.security_group_id}],assignPublicIp=DISABLED}" \
      --region ${var.aws_region}
    
    # View seed logs:
    aws logs tail ${aws_cloudwatch_log_group.seed_task.name} --follow
  EOF
}

output "seed_task_build_commands" {
  description = "Quick copy-paste commands for building and pushing seed image"
  value       = <<-EOF
    cd database_script && \
    docker build --platform linux/amd64 -t ${aws_ecr_repository.seed_scripts.repository_url}:latest . && \
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${split("/", aws_ecr_repository.seed_scripts.repository_url)[0]} && \
    docker push ${aws_ecr_repository.seed_scripts.repository_url}:latest
  EOF
}
