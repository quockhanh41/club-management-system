# ==============================================================================
# Security Groups
# ==============================================================================

# ALB Security Group (Public)
resource "aws_security_group" "alb_sg" {
  name        = "club-alb-sg"
  description = "Controls access to the ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Tasks Security Group (Private - Only traffic from ALB)
resource "aws_security_group" "ecs_tasks_sg" {
  name        = "club-ecs-tasks-sg"
  description = "Allow inbound access from the ALB only"
  vpc_id      = module.vpc.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 3000
    to_port         = 4000 # Allow all service ports
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ==============================================================================
# IAM Roles (Task Execution)
# ==============================================================================
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "club-ecs-task-execution-role"
 
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}
 
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ==============================================================================
# Application Load Balancer (ALB)
# ==============================================================================
resource "aws_lb" "main" {
  name               = "club-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = module.vpc.public_subnets
}
 
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
 
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "404: Not Found"
      status_code  = "404"
    }
  }
}

# ==============================================================================
# CloudWatch Logs
# ==============================================================================
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/club-management"
  retention_in_days = 7
}

# ==============================================================================
# ECS Cluster
# ==============================================================================
resource "aws_ecs_cluster" "main" {
  name = "club-management-cluster"
}

# ==============================================================================
# 1. Auth Service
# ==============================================================================
resource "aws_ecr_repository" "auth_repo" {
  name = "club-auth-service"
  force_delete = true
}

resource "aws_lb_target_group" "auth_tg" {
  name        = "tg-auth"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
  health_check {
    path = "/"
  }
}

resource "aws_lb_listener_rule" "auth_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.auth_tg.arn
  }
  condition {
    path_pattern {
      values = ["/api/auth*"]
    }
  }
}

resource "aws_ecs_task_definition" "auth_task" {
  family                   = "club-auth-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
 
  container_definitions = jsonencode([{
    name  = "auth-container"
    image = "${aws_ecr_repository.auth_repo.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3001
      hostPort      = 3001
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" },
      { name = "DATABASE_URL", value = "postgresql://auth_admin:${var.db_password}@${aws_db_instance.auth_db.endpoint}/auth_db" },
      { name = "RABBITMQ_URL", value = "amqps://rabbit_admin:${var.mq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" },
      { name = "REFRESH_TOKEN_SECRET", value = var.jwt_refresh_secret }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "auth"
      }
    }
  }])
}

resource "aws_ecs_service" "auth_service" {
  name            = "club-auth-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.auth_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"
 
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
 
  load_balancer {
    target_group_arn = aws_lb_target_group.auth_tg.arn
    container_name   = "auth-container"
    container_port   = 3001
  }
  
  depends_on = [aws_lb_listener.http]
}

# ==============================================================================
# 2. Club Service
# ==============================================================================
resource "aws_ecr_repository" "club_repo" {
  name = "club-club-service"
  force_delete = true
}

resource "aws_lb_target_group" "club_tg" {
  name        = "tg-club"
  port        = 3002
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
  health_check {
    path = "/health"
  }
}

resource "aws_lb_listener_rule" "club_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.club_tg.arn
  }
  condition {
    path_pattern {
      values = ["/api/clubs*", "/api/campaigns*", "/api/applications*"]
    }
  }
}

resource "aws_ecs_task_definition" "club_task" {
  family                   = "club-club-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
 
  container_definitions = jsonencode([{
    name  = "club-container"
    image = "${aws_ecr_repository.club_repo.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3002
      hostPort      = 3002
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3002" },
      { name = "MONGODB_URI", value = var.mongodb_uri },
      { name = "RABBITMQ_URL", value = "amqps://rabbit_admin:${var.mq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" },
      { name = "AUTH_SERVICE_URL", value = "http://${aws_lb.main.dns_name}/api/auth" }, # Internal comm via ALB
      { name = "API_GATEWAY_SECRET", value = var.api_gateway_secret }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "club"
      }
    }
  }])
}

resource "aws_ecs_service" "club_service" {
  name            = "club-club-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.club_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"
 
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
 
  load_balancer {
    target_group_arn = aws_lb_target_group.club_tg.arn
    container_name   = "club-container"
    container_port   = 3002
  }
}

# ==============================================================================
# 3. Event Service
# ==============================================================================
resource "aws_ecr_repository" "event_repo" {
  name = "club-event-service"
  force_delete = true
}

resource "aws_lb_target_group" "event_tg" {
  name        = "tg-event"
  port        = 3003
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
  health_check {
    path = "/health"
  }
}

resource "aws_lb_listener_rule" "event_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.event_tg.arn
  }
  condition {
    path_pattern {
      values = ["/api/events*"]
    }
  }
}

resource "aws_ecs_task_definition" "event_task" {
  family                   = "club-event-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
 
  container_definitions = jsonencode([{
    name  = "event-container"
    image = "${aws_ecr_repository.event_repo.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3003
      hostPort      = 3003
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3003" },
      { name = "MONGODB_URI", value = var.mongodb_uri },
      { name = "RABBITMQ_URL", value = "amqps://rabbit_admin:${var.mq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "event"
      }
    }
  }])
}

resource "aws_ecs_service" "event_service" {
  name            = "club-event-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.event_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"
 
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
 
  load_balancer {
    target_group_arn = aws_lb_target_group.event_tg.arn
    container_name   = "event-container"
    container_port   = 3003
  }
}

# ==============================================================================
# 4. Image Service
# ==============================================================================
resource "aws_ecr_repository" "image_repo" {
  name = "club-image-service"
  force_delete = true
}

resource "aws_lb_target_group" "image_tg" {
  name        = "tg-image"
  port        = 3004
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
  health_check {
    path = "/health"
  }
}

resource "aws_lb_listener_rule" "image_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 40
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.image_tg.arn
  }
  condition {
    path_pattern {
      values = ["/api/images*"]
    }
  }
}

resource "aws_ecs_task_definition" "image_task" {
  family                   = "club-image-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
 
  container_definitions = jsonencode([{
    name  = "image-container"
    image = "${aws_ecr_repository.image_repo.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3004
      hostPort      = 3004
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3004" },
      { name = "RABBITMQ_URL", value = "amqps://rabbit_admin:${var.mq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" }
      # Add Cloudinary keys via secrets or vars here if needed
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "image"
      }
    }
  }])
}

resource "aws_ecs_service" "image_service" {
  name            = "club-image-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.image_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"
 
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
 
  load_balancer {
    target_group_arn = aws_lb_target_group.image_tg.arn
    container_name   = "image-container"
    container_port   = 3004
  }
}

# ==============================================================================
# 5. Notify Service
# ==============================================================================
resource "aws_ecr_repository" "notify_repo" {
  name = "club-notify-service"
  force_delete = true
}

resource "aws_lb_target_group" "notify_tg" {
  name        = "tg-notify"
  port        = 3005
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
  health_check {
    path = "/"
  }
}

resource "aws_lb_listener_rule" "notify_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 50
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.notify_tg.arn
  }
  condition {
    path_pattern {
      values = ["/api/notifications*"]
    }
  }
}

resource "aws_ecs_task_definition" "notify_task" {
  family                   = "club-notify-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
 
  container_definitions = jsonencode([{
    name  = "notify-container"
    image = "${aws_ecr_repository.notify_repo.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3005
      hostPort      = 3005
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3005" },
      { name = "RABBITMQ_URL", value = "amqps://rabbit_admin:${var.mq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" },
      { name = "EMAIL_HOST", value = var.email_host },
      { name = "EMAIL_USER", value = var.email_user },
      { name = "EMAIL_PASSWORD", value = var.email_password },
      { name = "EMAIL_FROM", value = var.email_from },
      { name = "EMAIL_SERVICE", value = var.email_service },
      { name = "EMAIL_PORT", value = var.email_port },
      { name = "EMAIL_SECURE", value = var.email_secure }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "notify"
      }
    }
  }])
}

resource "aws_ecs_service" "notify_service" {
  name            = "club-notify-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.notify_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"
 
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
 
  load_balancer {
    target_group_arn = aws_lb_target_group.notify_tg.arn
    container_name   = "notify-container"
    container_port   = 3005
  }
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}
