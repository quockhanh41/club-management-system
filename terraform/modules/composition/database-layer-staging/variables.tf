variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for database resources"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "List of security group IDs allowed to access databases"
  type        = list(string)
}

variable "bastion_security_group_id" {
  description = "Security group ID of bastion host (optional)"
  type        = string
  default     = null
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15"
}

variable "rds_database_name" {
  description = "Database name"
  type        = string
  default     = "auth_db"
}

variable "rds_master_username" {
  description = "Master username for RDS"
  type        = string
  default     = "auth_admin"
}

variable "rds_master_password" {
  description = "Master password for RDS"
  type        = string
  sensitive   = true
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 1
}

# RabbitMQ Configuration
variable "ecs_cluster_id" {
  description = "ECS cluster ID where RabbitMQ will run"
  type        = string
}

variable "ecs_execution_role_arn" {
  description = "ECS task execution role ARN"
  type        = string
}

variable "rabbitmq_image" {
  description = "RabbitMQ Docker image"
  type        = string
  default     = "rabbitmq:3.13-management"
}

variable "rabbitmq_cpu" {
  description = "CPU units for RabbitMQ task"
  type        = string
  default     = "256"
}

variable "rabbitmq_memory" {
  description = "Memory for RabbitMQ task in MB"
  type        = string
  default     = "512"
}

variable "rabbitmq_desired_count" {
  description = "Desired count of RabbitMQ tasks"
  type        = number
  default     = 1
}

variable "rabbitmq_admin_username" {
  description = "RabbitMQ admin username"
  type        = string
  default     = "rabbit_admin"
}

variable "rabbitmq_admin_password" {
  description = "RabbitMQ admin password"
  type        = string
  sensitive   = true
}

variable "rabbitmq_log_retention_days" {
  description = "CloudWatch log retention days for RabbitMQ"
  type        = number
  default     = 7
}

variable "service_discovery_namespace_id" {
  description = "Service discovery namespace ID (optional)"
  type        = string
  default     = null
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
