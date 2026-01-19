output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.this.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL address (without port)"
  value       = aws_db_instance.this.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.this.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.this.db_name
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "rabbitmq_service_name" {
  description = "RabbitMQ ECS service name"
  value       = aws_ecs_service.rabbitmq.name
}

output "rabbitmq_task_definition_arn" {
  description = "RabbitMQ task definition ARN"
  value       = aws_ecs_task_definition.rabbitmq.arn
}

output "rabbitmq_security_group_id" {
  description = "Security group ID for RabbitMQ"
  value       = aws_security_group.rabbitmq.id
}

output "rabbitmq_endpoint" {
  description = "RabbitMQ connection endpoint"
  value       = var.service_discovery_namespace_id != null ? "amqp://${var.rabbitmq_admin_username}:${var.rabbitmq_admin_password}@rabbitmq.${var.name_prefix}.local:5672" : "Use service discovery or task IP"
}

output "rabbitmq_management_url" {
  description = "RabbitMQ management UI URL (use with port forwarding)"
  value       = "http://localhost:15672 (via port forwarding)"
}
