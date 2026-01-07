# Microservice Stack Module

Complete stack for deploying a microservice with ECR, ECS, ALB integration, and auto-scaling.

## Features

- **ECR Repository** - Docker image storage
- **ECS Service** - Fargate-based container orchestration
- **Security Group** - Network isolation with customizable rules
- **ALB Integration** - Automatic load balancer setup with health checks
- **Auto Scaling** - CPU and memory-based scaling
- **CloudWatch Logs** - Centralized logging

## Usage

```hcl
module "auth_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name    = "auth-service"
  cluster_id      = aws_ecs_cluster.main.id
  cluster_name    = aws_ecs_cluster.main.name
  container_image = "account-id.dkr.ecr.region.amazonaws.com/auth-service:latest"
  container_port  = 3001
  
  cpu           = 512
  memory        = 1024
  desired_count = 2
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  listener_rule_priority      = 10
  listener_rule_path_patterns = ["/api/auth*"]
  
  health_check_path = "/api/auth/health"
  
  # Auto Scaling
  enable_autoscaling      = true
  autoscaling_min_capacity = 2
  autoscaling_max_capacity = 10
  autoscaling_cpu_threshold = 70
  
  # Environment
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3001" }
  ]
  
  execution_role_arn = aws_iam_role.ecs_execution.arn
  region             = var.aws_region
  
  tags = {
    Environment = "production"
    Service     = "auth"
  }
}
```

## What This Module Creates

1. **ECR Repository** - For storing Docker images
2. **Security Group** - With ingress from ALB and egress to internet
3. **Target Group** - For ALB health checks and routing
4. **Listener Rule** - Routes traffic based on path patterns
5. **ECS Task Definition** - Container configuration
6. **ECS Service** - Manages running tasks
7. **CloudWatch Log Group** - For application logs
8. **Auto Scaling** (optional) - CPU and memory-based scaling policies

## Comparison with Direct Resources

### Before (Monolithic)
```hcl
resource "aws_ecr_repository" "auth" { ... }
resource "aws_security_group" "auth_sg" { ... }
resource "aws_security_group_rule" "auth_ingress" { ... }
resource "aws_lb_target_group" "auth" { ... }
resource "aws_lb_listener_rule" "auth" { ... }
resource "aws_ecs_task_definition" "auth" { ... }
resource "aws_ecs_service" "auth" { ... }
resource "aws_cloudwatch_log_group" "auth" { ... }
# Repeat for each service...
```

### After (Module-Based)
```hcl
module "auth_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name = "auth-service"
  # ... 10-15 variables
}

module "club_service" {
  source = "../../modules/composition/microservice-stack"
  
  service_name = "club-service"
  # ... 10-15 variables
}
```

## Inputs

See `variables.tf` for complete list.

### Required
- `service_name` - Name of the microservice
- `cluster_id` - ECS cluster ID
- `container_image` - Docker image URL
- `container_port` - Container port number
- `vpc_id` - VPC ID
- `private_subnet_ids` - Private subnet IDs
- `execution_role_arn` - ECS execution role ARN
- `region` - AWS Region

### Optional (with defaults)
- `cpu` - CPU units (default: 256)
- `memory` - Memory in MB (default: 512)
- `desired_count` - Task count (default: 1)
- `enable_autoscaling` - Enable auto scaling (default: false)
- `attach_to_alb` - Attach to ALB (default: true)

## Outputs

- `ecr_repository_url` - ECR repository URL
- `security_group_id` - Security group ID
- `service_name` - ECS service name
- `log_group_name` - CloudWatch log group name
