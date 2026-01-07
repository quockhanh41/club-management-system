variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to access databases"
  type        = list(string)
}

variable "bastion_security_group_id" {
  description = "Security group ID of bastion host (optional)"
  type        = string
  default     = null
}

# RDS PostgreSQL Variables
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_storage_type" {
  description = "Storage type"
  type        = string
  default     = "gp3"
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15"
}

variable "rds_database_name" {
  description = "Database name"
  type        = string
  default     = "app_db"
}

variable "rds_master_username" {
  description = "Master username"
  type        = string
  default     = "dbadmin"
}

variable "rds_master_password" {
  description = "Master password"
  type        = string
  sensitive   = true
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "rds_backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "rds_maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot on deletion"
  type        = bool
  default     = false
}

variable "rds_enabled_cloudwatch_logs" {
  description = "CloudWatch log types to enable"
  type        = list(string)
  default     = ["postgresql", "upgrade"]
}

# Amazon MQ Variables
variable "mq_instance_type" {
  description = "Amazon MQ instance type"
  type        = string
  default     = "mq.t3.micro"
}

variable "mq_engine_version" {
  description = "RabbitMQ engine version"
  type        = string
  default     = "3.13"
}

variable "mq_deployment_mode" {
  description = "Deployment mode (SINGLE_INSTANCE or ACTIVE_STANDBY_MULTI_AZ)"
  type        = string
  default     = "SINGLE_INSTANCE"
}

variable "mq_admin_username" {
  description = "Admin username for RabbitMQ"
  type        = string
  default     = "mqadmin"
}

variable "mq_admin_password" {
  description = "Admin password for RabbitMQ"
  type        = string
  sensitive   = true
}

variable "mq_auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

variable "mq_enable_general_logs" {
  description = "Enable general logs"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
