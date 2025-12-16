# ==============================================================================
# Frontend Service (Next.js)
# ==============================================================================

resource "aws_ecr_repository" "frontend_repo" {
  name         = "club-frontend"
  force_delete = true
}

resource "aws_lb_target_group" "frontend_tg" {
  name        = "tg-frontend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
  health_check {
    path = "/"
    matcher = "200"
  }
}

# Catch-all rule for Frontend
resource "aws_lb_listener_rule" "frontend_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100 # Low priority to allow API rules (10-50) to match first
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }
  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}

resource "aws_ecs_task_definition" "frontend_task" {
  family                   = "club-frontend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024 # Frontend might need more memory for SSR
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([{
    name      = "frontend-container"
    image     = "${aws_ecr_repository.frontend_repo.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" }
      # NEXT_PUBLIC_ vars are build-time, not runtime, so they don't go here usually.
      # But we add them just in case specific logic uses process.env
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "frontend"
      }
    }
  }])
}

resource "aws_ecs_service" "frontend_service" {
  name            = "club-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend_tg.arn
    container_name   = "frontend-container"
    container_port   = 3000
  }
  
  depends_on = [aws_lb_listener.http]
}
