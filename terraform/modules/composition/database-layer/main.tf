# RDS PostgreSQL
resource "aws_db_subnet_group" "rds" {
  name       = "${var.name_prefix}-rds-subnet-group"
  subnet_ids = var.private_subnet_ids
  
  tags = merge(
    var.tags,
    { Name = "${var.name_prefix}-rds-subnet-group" }
  )
}

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

resource "aws_db_instance" "this" {
  identifier        = "${var.name_prefix}-postgres"
  allocated_storage = var.rds_allocated_storage
  storage_type      = var.rds_storage_type
  engine            = "postgres"
  engine_version    = var.rds_engine_version
  instance_class    = var.rds_instance_class
  db_name           = var.rds_database_name
  username          = var.rds_master_username
  password          = var.rds_master_password
  
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  skip_final_snapshot       = var.rds_skip_final_snapshot
  final_snapshot_identifier = var.rds_skip_final_snapshot ? null : "${var.name_prefix}-postgres-final-snapshot"
  publicly_accessible       = false
  multi_az                  = var.rds_multi_az
  
  backup_retention_period = var.rds_backup_retention_period
  backup_window           = var.rds_backup_window
  maintenance_window      = var.rds_maintenance_window
  
  enabled_cloudwatch_logs_exports = var.rds_enabled_cloudwatch_logs
  
  storage_encrypted = true
  
  tags = merge(
    var.tags,
    { Name = "${var.name_prefix}-postgres" }
  )
}

# Amazon MQ (RabbitMQ)
resource "aws_security_group" "mq" {
  name        = "${var.name_prefix}-mq-sg"
  description = "Security group for Amazon MQ"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 5671
    to_port         = 5671
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "RabbitMQ SSL from ECS"
  }
  
  ingress {
    from_port       = 5672
    to_port         = 5672
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "RabbitMQ from ECS"
  }
  
  dynamic "ingress" {
    for_each = var.bastion_security_group_id != null ? [1] : []
    content {
      from_port       = 5672
      to_port         = 5672
      protocol        = "tcp"
      security_groups = [var.bastion_security_group_id]
      description     = "RabbitMQ from Bastion"
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
    { Name = "${var.name_prefix}-mq-sg" }
  )
}

resource "aws_mq_broker" "this" {
  broker_name = "${var.name_prefix}-rabbitmq"
  
  engine_type        = "RabbitMQ"
  engine_version     = var.mq_engine_version
  host_instance_type = var.mq_instance_type
  deployment_mode    = var.mq_deployment_mode
  
  auto_minor_version_upgrade = var.mq_auto_minor_version_upgrade
  
  user {
    username = var.mq_admin_username
    password = var.mq_admin_password
  }
  
  subnet_ids      = var.mq_deployment_mode == "SINGLE_INSTANCE" ? [var.private_subnet_ids[0]] : slice(var.private_subnet_ids, 0, 2)
  security_groups = [aws_security_group.mq.id]
  
  publicly_accessible = false
  
  logs {
    general = var.mq_enable_general_logs
  }
  
  tags = merge(
    var.tags,
    { Name = "${var.name_prefix}-rabbitmq" }
  )
}
