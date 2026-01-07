resource "aws_lb" "this" {
  name               = var.name
  internal           = var.internal
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids
  
  enable_deletion_protection = var.enable_deletion_protection
  enable_http2              = var.enable_http2
  idle_timeout              = var.idle_timeout
  
  dynamic "access_logs" {
    for_each = var.access_logs_bucket != null ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = var.access_logs_prefix
      enabled = true
    }
  }
  
  tags = var.tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"
  
  default_action {
    type = var.default_action_type
    
    dynamic "fixed_response" {
      for_each = var.default_action_type == "fixed-response" ? [1] : []
      content {
        content_type = var.default_fixed_response_content_type
        message_body = var.default_fixed_response_message_body
        status_code  = var.default_fixed_response_status_code
      }
    }
    
    dynamic "redirect" {
      for_each = var.default_action_type == "redirect" ? [1] : []
      content {
        port        = var.default_redirect_port
        protocol    = var.default_redirect_protocol
        status_code = var.default_redirect_status_code
      }
    }
  }
  
  tags = var.tags
}

resource "aws_lb_listener" "https" {
  count = var.certificate_arn != null ? 1 : 0
  
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn
  
  default_action {
    type = var.default_action_type
    
    dynamic "fixed_response" {
      for_each = var.default_action_type == "fixed-response" ? [1] : []
      content {
        content_type = var.default_fixed_response_content_type
        message_body = var.default_fixed_response_message_body
        status_code  = var.default_fixed_response_status_code
      }
    }
  }
  
  tags = var.tags
}
