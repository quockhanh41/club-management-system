# ==============================================================================
# Database Layer for Staging Environment
# Cost-optimized configuration with self-hosted RabbitMQ
# ==============================================================================

# RDS Subnet Group
resource "aws_db_subnet_group" "rds" {
  name       = "${var.name_prefix}-rds-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(
    var.tags,
    {
      Name     = "${var.name_prefix}-rds-subnet-group"
      Schedule = "business-hours"
    }
  )
}

# RDS PostgreSQL Security Group
resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "PostgreSQL from ECS"
  }
  
  dynamic "ingress" {
    for_each = var.bastion_security_group_id != null ? [1] : []
    content {
      from_port       = 5432
      to_port         = 5432
      protocol        = "tcp"
      security_groups = [var.bastion_security_group_id]
      description     = "PostgreSQL from Bastion"
    }
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(
    var.tags,
    { Name = "${var.name_prefix}-rds-sg" }
  )
}

# RDS PostgreSQL Instance (Cost-optimized for staging)
resource "aws_db_instance" "this" {
  identifier        = "${var.name_prefix}-postgres"
  allocated_storage = var.rds_allocated_storage
  storage_type      = "gp3"
  engine            = "postgres"
  engine_version    = var.rds_engine_version
  instance_class    = var.rds_instance_class
  db_name           = var.rds_database_name
  username          = var.rds_master_username
  password          = var.rds_master_password
  
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  # Staging optimizations
  skip_final_snapshot       = true   # No snapshot on delete
  publicly_accessible       = false
  multi_az                  = false  # Single-AZ for cost saving
  backup_retention_period   = var.rds_backup_retention_period
  deletion_protection       = false  # Allow easy cleanup
  
  # Performance optimizations
  max_allocated_storage = 100  # Enable autoscaling
  
  storage_encrypted = true
  
  tags = merge(
    var.tags,
    {
      Name     = "${var.name_prefix}-postgres"
      Schedule = "business-hours"
    }
  )
}

# ==============================================================================
# Self-hosted RabbitMQ in ECS (Cost Saving vs Amazon MQ)
# ==============================================================================

# CloudWatch Log Group for RabbitMQ
resource "aws_cloudwatch_log_group" "rabbitmq" {
  name              = "/ecs/${var.name_prefix}-rabbitmq"
  retention_in_days = var.rabbitmq_log_retention_days
  
  tags = var.tags
}

# RabbitMQ Security Group
resource "aws_security_group" "rabbitmq" {
  name        = "${var.name_prefix}-rabbitmq-sg"
  description = "Security group for self-hosted RabbitMQ"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 5672
    to_port         = 5672
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "RabbitMQ from ECS tasks"
  }
  
  ingress {
    from_port       = 15672
    to_port         = 15672
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "RabbitMQ Management UI"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(
    var.tags,
    { Name = "${var.name_prefix}-rabbitmq-sg" }
  )
}

# RabbitMQ ECS Task Definition
resource "aws_ecs_task_definition" "rabbitmq" {
  family                   = "${var.name_prefix}-rabbitmq"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.rabbitmq_cpu
  memory                   = var.rabbitmq_memory
  execution_role_arn       = var.ecs_execution_role_arn
  
  container_definitions = jsonencode([
    {
      name      = "rabbitmq"
      image     = var.rabbitmq_image
      essential = true
      
      portMappings = [
        {
          containerPort = 5672
          protocol      = "tcp"
        },
        {
          containerPort = 15672  # Management UI
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "RABBITMQ_DEFAULT_USER"
          value = var.rabbitmq_admin_username
        },
        {
          name  = "RABBITMQ_DEFAULT_PASS"
          value = var.rabbitmq_admin_password
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.rabbitmq.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "rabbitmq"
        }
      }
    }
  ])
  
  tags = merge(
    var.tags,
    {
      Name     = "${var.name_prefix}-rabbitmq"
      Schedule = "business-hours"
    }
  )
}

# RabbitMQ ECS Service
resource "aws_ecs_service" "rabbitmq" {
  name            = "${var.name_prefix}-rabbitmq"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.rabbitmq.arn
  desired_count   = var.rabbitmq_desired_count
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.rabbitmq.id]
    assign_public_ip = false
  }
  
  service_registries {
    registry_arn = aws_service_discovery_service.rabbitmq.arn
  }
  
  tags = merge(
    var.tags,
    {
      Name     = "${var.name_prefix}-rabbitmq-service"
      Schedule = "business-hours"
    }
  )
}

# Service Discovery for RabbitMQ
resource "aws_service_discovery_service" "rabbitmq" {
  
  name = "rabbitmq"
  
  dns_config {
    namespace_id = var.service_discovery_namespace_id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
    
    routing_policy = "MULTIVALUE"
  }
  
  health_check_custom_config {
    failure_threshold = 1
  }
  
  tags = var.tags
}
