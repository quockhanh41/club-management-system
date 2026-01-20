variable "service_name" {
  description = "Name of the microservice"
  type        = string
}

variable "repository_name" {
  description = "Name of the ECR repository (defaults to service_name)"
  type        = string
  default     = null
}

variable "cluster_id" {
  description = "ID of the ECS cluster"
  type        = string
}

variable "cluster_name" {
  description = "Name of the ECS cluster (required for autoscaling)"
  type        = string
  default     = ""
}

variable "container_image" {
  description = "Docker image for the container"
  type        = string
}

variable "container_port" {
  description = "Port that the container listens on"
  type        = number
}

variable "cpu" {
  description = "CPU units for the task"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory for the task in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of task instances"
  type        = number
  default     = 1
}

# Networking
variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "assign_public_ip" {
  description = "Assign public IP to tasks"
  type        = bool
  default     = false
}

# Load Balancer
variable "attach_to_alb" {
  description = "Whether to attach the service to an ALB"
  type        = bool
  default     = true
}

variable "alb_listener_arn" {
  description = "ARN of the ALB listener"
  type        = string
  default     = null
}


variable "alb_security_group_id" {
  description = "Security group ID of the ALB"
  type        = string
  default     = null
}

variable "additional_security_group_ids" {
  description = "Additional security group IDs to attach to the service (e.g., for database access)"
  type        = list(string)
  default     = []
}

variable "listener_rule_priority" {
  description = "Priority of the listener rule (10-50000)"
  type        = number
  default     = 100
}

variable "listener_rule_path_patterns" {
  description = "Path patterns for the listener rule"
  type        = list(string)
  default     = ["/*"]
}

variable "deregistration_delay" {
  description = "Deregistration delay in seconds"
  type        = number
  default     = 30
}

# Health Check
variable "health_check_path" {
  description = "Health check path"
  type        = string
  default     = "/health"
}

variable "health_check_matcher" {
  description = "Health check matcher"
  type        = string
  default     = "200"
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 5
}

variable "health_check_healthy_threshold" {
  description = "Healthy threshold count"
  type        = number
  default     = 2
}

variable "health_check_unhealthy_threshold" {
  description = "Unhealthy threshold count"
  type        = number
  default     = 2
}

variable "container_health_check" {
  description = "Container-level health check"
  type = object({
    command     = list(string)
    interval    = number
    timeout     = number
    retries     = number
    startPeriod = number
  })
  default = null
}

# IAM
variable "execution_role_arn" {
  description = "ARN of the task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the task role"
  type        = string
  default     = null
}

# Environment
variable "environment_variables" {
  description = "Environment variables"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secrets" {
  description = "Secrets from AWS Secrets Manager"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

# Security
variable "additional_ingress_rules" {
  description = "Additional ingress rules for the security group"
  type = list(object({
    from_port                = number
    to_port                  = number
    protocol                 = string
    description              = optional(string)
    cidr_blocks              = optional(list(string))
    source_security_group_id = optional(string)
  }))
  default = []
}

variable "egress_rules" {
  description = "Egress rules for the security group"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    description = optional(string)
    cidr_blocks = optional(list(string))
  }))
  default = [{
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }]
}

# Deployment
variable "max_percent" {
  description = "Maximum percentage during deployment"
  type        = number
  default     = 200
}

variable "min_healthy_percent" {
  description = "Minimum healthy percentage during deployment"
  type        = number
  default     = 100
}

# Auto Scaling
variable "enable_autoscaling" {
  description = "Enable auto scaling"
  type        = bool
  default     = false
}

variable "autoscaling_min_capacity" {
  description = "Minimum capacity for auto scaling"
  type        = number
  default     = 1
}

variable "autoscaling_max_capacity" {
  description = "Maximum capacity for auto scaling"
  type        = number
  default     = 10
}

variable "autoscaling_cpu_threshold" {
  description = "CPU threshold for auto scaling"
  type        = number
  default     = 70
}

variable "autoscaling_memory_threshold" {
  description = "Memory threshold for auto scaling"
  type        = number
  default     = 80
}

variable "autoscaling_scale_in_cooldown" {
  description = "Scale in cooldown in seconds"
  type        = number
  default     = 300
}

variable "autoscaling_scale_out_cooldown" {
  description = "Scale out cooldown in seconds"
  type        = number
  default     = 60
}

# ECR
variable "ecr_force_delete" {
  description = "Force delete ECR repository"
  type        = bool
  default     = true
}

variable "ecr_scan_on_push" {
  description = "Scan images on push"
  type        = bool
  default     = true
}

variable "ecr_lifecycle_policy" {
  description = "ECR lifecycle policy JSON"
  type        = string
  default     = null
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 7
}

variable "enable_execute_command" {
  description = "Enable ECS Exec"
  type        = bool
  default     = false
}

# General
variable "region" {
  description = "AWS Region"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
