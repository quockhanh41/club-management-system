output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.this.endpoint
}

output "rds_address" {
  description = "RDS address (without port)"
  value       = aws_db_instance.this.address
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.this.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.this.db_name
}

output "rds_username" {
  description = "RDS master username"
  value       = aws_db_instance.this.username
  sensitive   = true
}

output "rds_connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${aws_db_instance.this.username}@${aws_db_instance.this.endpoint}/${aws_db_instance.this.db_name}"
  sensitive   = true
}

output "mq_endpoint" {
  description = "Amazon MQ endpoint"
  value       = aws_mq_broker.this.instances[0].endpoints[0]
  sensitive   = true
}

output "mq_console_url" {
  description = "Amazon MQ console URL"
  value       = aws_mq_broker.this.instances[0].console_url
}

output "mq_username" {
  description = "Amazon MQ username"
  value       = var.mq_admin_username
  sensitive   = true
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "mq_security_group_id" {
  description = "Amazon MQ security group ID"
  value       = aws_security_group.mq.id
}
