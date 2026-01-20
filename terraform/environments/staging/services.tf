
# ==============================================================================
# CLUB SERVICE
# ==============================================================================
module "club_service" {
  source = "../../modules/composition/microservice-stack"

  service_name     = "club-service"
  vpc_id           = module.vpc.vpc_id
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  repository_name  = "club-club-service"
  
  container_image  = var.club_service_image
  container_port   = 3002
  cpu              = 256
  memory           = 512
  desired_count    = 1
  
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 110
  listener_rule_path_patterns = ["/api/clubs*"]
  health_check_path           = "/api/clubs/health"
  health_check_interval       = 30
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  additional_security_group_ids = [module.ecs_tasks_sg.security_group_id]
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3002" },
    { name = "MONGODB_URI", value = var.mongodb_uri },
    { name = "RABBITMQ_URL", value = "amqp://rabbit_admin:${var.mq_password}@rabbitmq.${var.environment}.club.local:5672" },
    { name = "API_GATEWAY_SECRET", value = var.api_gateway_secret },
    { name = "AUTH_SERVICE_URL", value = "http://auth-service.${var.environment}.club.local:3001" },
    { name = "EVENT_SERVICE_URL", value = "http://event-service.${var.environment}.club.local:3003" },
    { name = "MOCK_DB", value = "false" }
  ]
  
  log_retention_days = 7
  region             = var.aws_region
  tags               = local.common_tags
}

# ==============================================================================
# EVENT SERVICE
# ==============================================================================
module "event_service" {
  source = "../../modules/composition/microservice-stack"

  service_name     = "event-service"
  vpc_id           = module.vpc.vpc_id
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  repository_name  = "club-event-service"
  
  container_image  = var.event_service_image
  container_port   = 3003
  cpu              = 256
  memory           = 512
  desired_count    = 1
  
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 120
  listener_rule_path_patterns = ["/api/events*"]
  health_check_path           = "/health"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  additional_security_group_ids = [module.ecs_tasks_sg.security_group_id]
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3003" },
    { name = "MONGODB_URI", value = var.mongodb_uri },
    { name = "RABBITMQ_URL", value = "amqp://rabbit_admin:${var.mq_password}@rabbitmq.${var.environment}.club.local:5672" },
    { name = "API_GATEWAY_SECRET", value = var.api_gateway_secret },
    { name = "MOCK_DB", value = "false" }
  ]
  
  log_retention_days = 7
  region             = var.aws_region
  tags               = local.common_tags
}

# ==============================================================================
# IMAGE SERVICE
# ==============================================================================
module "image_service" {
  source = "../../modules/composition/microservice-stack"

  service_name     = "image-service"
  vpc_id           = module.vpc.vpc_id
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  repository_name  = "club-image-service"
  
  container_image  = var.image_service_image
  container_port   = 3004
  cpu              = 256
  memory           = 512
  desired_count    = 1
  
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 130
  listener_rule_path_patterns = ["/api/images*"]
  health_check_path           = "/health"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  additional_security_group_ids = [module.ecs_tasks_sg.security_group_id]
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3004" },
    { name = "CLOUDINARY_CLOUD_NAME", value = var.cloudinary_cloud_name },
    { name = "CLOUDINARY_API_KEY", value = var.cloudinary_api_key },
    { name = "CLOUDINARY_API_SECRET", value = var.cloudinary_api_secret },
    { name = "RABBITMQ_URL", value = "amqp://rabbit_admin:${var.mq_password}@rabbitmq.${var.environment}.club.local:5672" },
    { name = "MAX_FILE_SIZE", value = "10MB" },
    { name = "MAX_FILES", value = "10" }
  ]
  
  log_retention_days = 7
  region             = var.aws_region
  tags               = local.common_tags
}

# ==============================================================================
# NOTIFY SERVICE
# ==============================================================================
module "notify_service" {
  source = "../../modules/composition/microservice-stack"

  service_name     = "notify-service"
  vpc_id           = module.vpc.vpc_id
  cluster_id       = aws_ecs_cluster.main.id
  cluster_name     = aws_ecs_cluster.main.name
  repository_name  = "club-notify-service"
  
  container_image  = var.notify_service_image
  container_port   = 3005
  cpu              = 256
  memory           = 512
  desired_count    = 1
  
  private_subnet_ids    = module.vpc.private_subnets
  alb_listener_arn      = module.alb.http_listener_arn
  alb_security_group_id = module.alb_sg.security_group_id
  
  attach_to_alb               = true
  listener_rule_priority      = 140
  listener_rule_path_patterns = ["/api/notify*"]
  health_check_path           = "/health"
  
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  additional_security_group_ids = [module.ecs_tasks_sg.security_group_id]
  
  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3005" },
    { name = "HOST", value = "0.0.0.0" },
    { name = "RABBITMQ_URL", value = "amqp://rabbit_admin:${var.mq_password}@rabbitmq.${var.environment}.club.local:5672" },
    { name = "RABBITMQ_EXCHANGE", value = "club_events" },
    { name = "EMAIL_SERVICE", value = var.email_service },
    { name = "EMAIL_HOST", value = var.email_host },
    { name = "EMAIL_PORT", value = var.email_port },
    { name = "EMAIL_SECURE", value = var.email_secure },
    { name = "EMAIL_USER", value = var.email_user },
    { name = "EMAIL_PASSWORD", value = var.email_password },
    { name = "EMAIL_FROM", value = var.email_from },
    { name = "API_GATEWAY_SECRET", value = var.api_gateway_secret },
    { name = "FRONTEND_BASE_URL", value = "http://localhost:3000" },
    { name = "ENABLE_HEALTH_LOGGING", value = "true" }
  ]
  
  log_retention_days = 7
  region             = var.aws_region
  tags               = local.common_tags
}
