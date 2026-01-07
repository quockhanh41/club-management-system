variable "name" {
  description = "Name of the ALB"
  type        = string
}

variable "internal" {
  description = "Whether the ALB is internal"
  type        = bool
  default     = false
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "enable_http2" {
  description = "Enable HTTP/2"
  type        = bool
  default     = true
}

variable "idle_timeout" {
  description = "Idle timeout in seconds"
  type        = number
  default     = 60
}

variable "access_logs_bucket" {
  description = "S3 bucket for access logs"
  type        = string
  default     = null
}

variable "access_logs_prefix" {
  description = "S3 prefix for access logs"
  type        = string
  default     = "alb"
}

variable "default_action_type" {
  description = "Default action type (fixed-response or redirect)"
  type        = string
  default     = "fixed-response"
}

variable "default_fixed_response_content_type" {
  description = "Content type for fixed response"
  type        = string
  default     = "text/plain"
}

variable "default_fixed_response_message_body" {
  description = "Message body for fixed response"
  type        = string
  default     = "404: Not Found"
}

variable "default_fixed_response_status_code" {
  description = "Status code for fixed response"
  type        = string
  default     = "404"
}

variable "default_redirect_port" {
  description = "Port for redirect"
  type        = string
  default     = "443"
}

variable "default_redirect_protocol" {
  description = "Protocol for redirect"
  type        = string
  default     = "HTTPS"
}

variable "default_redirect_status_code" {
  description = "Status code for redirect"
  type        = string
  default     = "HTTP_301"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS listener"
  type        = string
  default     = null
}

variable "ssl_policy" {
  description = "SSL policy for HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
