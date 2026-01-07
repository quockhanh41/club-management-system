# ECR Repository for the service
module "ecr" {
  source = "../../foundational/ecr-repository"
  
  repository_name = var.repository_name
  force_delete    = var.ecr_force_delete
  scan_on_push    = var.ecr_scan_on_push
  
  lifecycle_policy = var.ecr_lifecycle_policy
  
  tags = var.tags
}

# Security Group for the service
module "security_group" {
  source = "../../foundational/security-group"
  
  name        = "${var.service_name}-sg"
  description = "Security group for ${var.service_name}"
  vpc_id      = var.vpc_id
  
  ingress_rules = concat(
    [
      {
        from_port                = var.container_port
        to_port                  = var.container_port
        protocol                 = "tcp"
        description              = "Allow traffic from ALB"
        source_security_group_id = var.alb_security_group_id
      }
    ],
    var.additional_ingress_rules
  )
  
  egress_rules = var.egress_rules
  
  tags = var.tags
}

# Target Group for ALB (if enabled)
resource "aws_lb_target_group" "this" {
  count = var.attach_to_alb ? 1 : 0
  
  name        = "${var.service_name}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  
  deregistration_delay = var.deregistration_delay
  
  health_check {
    enabled             = true
    path                = var.health_check_path
    protocol            = "HTTP"
    matcher             = var.health_check_matcher
    interval            = var.health_check_interval
    timeout             = var.health_check_timeout
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
  }
  
  tags = var.tags
}

# ALB Listener Rule (if enabled)
resource "aws_lb_listener_rule" "this" {
  count = var.attach_to_alb ? 1 : 0
  
  listener_arn = var.alb_listener_arn
  priority     = var.listener_rule_priority
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this[0].arn
  }
  
  condition {
    path_pattern {
      values = var.listener_rule_path_patterns
    }
  }
  
  tags = var.tags
}

# ECS Service
module "ecs_service" {
  source = "../../foundational/ecs-service"
  
  service_name    = var.service_name
  cluster_id      = var.cluster_id
  container_image = var.container_image
  container_port  = var.container_port
  
  cpu           = var.cpu
  memory        = var.memory
  desired_count = var.desired_count
  
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [module.security_group.security_group_id]
  assign_public_ip   = var.assign_public_ip
  
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arn
  
  environment_variables = var.environment_variables
  secrets               = var.secrets
  
  target_group_arn = var.attach_to_alb ? aws_lb_target_group.this[0].arn : null
  
  container_health_check = var.container_health_check
  
  max_percent         = var.max_percent
  min_healthy_percent = var.min_healthy_percent
  
  enable_execute_command = var.enable_execute_command
  log_retention_days     = var.log_retention_days
  
  region = var.region
  
  depends_on_resources = var.attach_to_alb ? [aws_lb_listener_rule.this[0]] : []
  
  tags = var.tags
}

# Auto Scaling (if enabled)
resource "aws_appautoscaling_target" "this" {
  count = var.enable_autoscaling ? 1 : 0
  
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${var.cluster_name}/${module.ecs_service.service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  count = var.enable_autoscaling ? 1 : 0
  
  name               = "${var.service_name}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[0].resource_id
  scalable_dimension = aws_appautoscaling_target.this[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.autoscaling_cpu_threshold
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

resource "aws_appautoscaling_policy" "memory" {
  count = var.enable_autoscaling ? 1 : 0
  
  name               = "${var.service_name}-memory-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[0].resource_id
  scalable_dimension = aws_appautoscaling_target.this[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.autoscaling_memory_threshold
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}
