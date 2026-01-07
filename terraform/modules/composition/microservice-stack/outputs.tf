output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.ecr.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = module.ecr.repository_arn
}

output "security_group_id" {
  description = "ID of the service security group"
  value       = module.security_group.security_group_id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = var.attach_to_alb ? aws_lb_target_group.this[0].arn : null
}

output "service_id" {
  description = "ID of the ECS service"
  value       = module.ecs_service.service_id
}

output "service_name" {
  description = "Name of the ECS service"
  value       = module.ecs_service.service_name
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = module.ecs_service.task_definition_arn
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = module.ecs_service.log_group_name
}
