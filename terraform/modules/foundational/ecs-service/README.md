# ECS Service Module

Reusable module for creating an ECS Fargate service with CloudWatch logging.

## Features

- Fargate launch type
- Automatic CloudWatch log group creation
- Support for environment variables and secrets
- Optional ALB integration
- Configurable health checks
- ECS Exec support for debugging

## Usage

```hcl
module "auth_service" {
  source = "../../modules/foundational/ecs-service"
  
  service_name    = "auth-service"
  cluster_id      = aws_ecs_cluster.main.id
  container_image = "${aws_ecr_repository.auth.repository_url}:latest"
  container_port  = 3001
  
  cpu           = 512
  memory        = 1024
  desired_count = 2
  
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.ecs_tasks.id]
  
  execution_role_arn = aws_iam_role.ecs_execution.arn
  target_group_arn   = aws_lb_target_group.auth.arn
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3001" }
  ]
  
  region = var.aws_region
  
  tags = {
    Environment = "production"
    Service     = "auth"
  }
}
```

## Inputs

See `variables.tf` for all available inputs.

## Outputs

- `service_id` - ID of the ECS service
- `service_name` - Name of the ECS service
- `task_definition_arn` - ARN of the task definition
- `log_group_name` - Name of the CloudWatch log group
