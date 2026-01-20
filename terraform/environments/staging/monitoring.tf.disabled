# ==============================================================================
# CloudWatch Dashboard for Staging Environment
# ==============================================================================

resource "aws_cloudwatch_dashboard" "staging" {
  dashboard_name = "${var.environment}-club-management"

  dashboard_body = jsonencode({
    widgets = [
      # ==============================================================================
      # Row 1: ECS Services Health
      # ==============================================================================
      {
        type = "metric"
        x    = 0
        y    = 0
        width = 12
        height = 6
        properties = {
          title  = "ECS Service - Desired vs Running Tasks"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "DesiredTaskCount", { stat = "Average", label = "Auth Desired" }],
            [".", "RunningTaskCount", { stat = "Average", label = "Auth Running" }],
            ["AWS/ECS", "DesiredTaskCount", "ServiceName", aws_ecs_service.rabbitmq.name, { stat = "Average", label = "RabbitMQ Desired" }],
            [".", "RunningTaskCount", ".", ".", { stat = "Average", label = "RabbitMQ Running" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      
      {
        type = "metric"
        x    = 12
        y    = 0
        width = 12
        height = 6
        properties = {
          title  = "ECS CPU Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.auth.name, "ClusterName", aws_ecs_cluster.main.name, { stat = "Average", label = "Auth CPU" }],
            ["...", aws_ecs_service.rabbitmq.name, ".", ".", { stat = "Average", label = "RabbitMQ CPU" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },

      # ==============================================================================
      # Row 2: Memory & Network
      # ==============================================================================
      {
        type = "metric"
        x    = 0
        y    = 6
        width = 12
        height = 6
        properties = {
          title  = "ECS Memory Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ServiceName", aws_ecs_service.auth.name, "ClusterName", aws_ecs_cluster.main.name, { stat = "Average", label = "Auth Memory" }],
            ["...", aws_ecs_service.rabbitmq.name, ".", ".", { stat = "Average", label = "RabbitMQ Memory" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },

      {
        type = "metric"
        x    = 12
        y    = 6
        width = 12
        height = 6
        properties = {
          title  = "ALB Request Count"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix, { stat = "Sum", label = "Total Requests" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
        }
      },

      # ==============================================================================
      # Row 3: ALB Metrics
      # ==============================================================================
      {
        type = "metric"
        x    = 0
        y    = 12
        width = 8
        height = 6
        properties = {
          title  = "ALB Target Response Time"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix, { stat = "Average", label = "Avg Response Time" }],
            ["...", { stat = "p95", label = "p95" }],
            ["...", { stat = "p99", label = "p99" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      {
        type = "metric"
        x    = 8
        y    = 12
        width = 8
        height = 6
        properties = {
          title  = "ALB HTTP Response Codes"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", aws_lb.main.arn_suffix, { stat = "Sum", label = "2xx Success" }],
            [".", "HTTPCode_Target_4XX_Count", ".", ".", { stat = "Sum", label = "4xx Client Error" }],
            [".", "HTTPCode_Target_5XX_Count", ".", ".", { stat = "Sum", label = "5xx Server Error" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
        }
      },

      {
        type = "metric"
        x    = 16
        y    = 12
        width = 8
        height = 6
        properties = {
          title  = "ALB Healthy/Unhealthy Hosts"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", aws_lb_target_group.auth.arn_suffix, "LoadBalancer", aws_lb.main.arn_suffix, { stat = "Average", label = "Healthy" }],
            [".", "UnHealthyHostCount", ".", ".", ".", ".", { stat = "Average", label = "Unhealthy" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
        }
      },

      # ==============================================================================
      # Row 4: RDS Metrics
      # ==============================================================================
      {
        type = "metric"
        x    = 0
        y    = 18
        width = 8
        height = 6
        properties = {
          title  = "RDS CPU & Memory"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.auth_db.identifier, { stat = "Average", label = "CPU %" }],
            [".", "FreeableMemory", ".", ".", { stat = "Average", yAxis = "right", label = "Free Memory (bytes)" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
        }
      },

      {
        type = "metric"
        x    = 8
        y    = 18
        width = 8
        height = 6
        properties = {
          title  = "RDS Database Connections"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.auth_db.identifier, { stat = "Average" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      {
        type = "metric"
        x    = 16
        y    = 18
        width = 8
        height = 6
        properties = {
          title  = "RDS Storage & IOPS"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", aws_db_instance.auth_db.identifier, { stat = "Average", label = "Free Storage" }],
            [".", "ReadIOPS", ".", ".", { stat = "Average", yAxis = "right", label = "Read IOPS" }],
            [".", "WriteIOPS", ".", ".", { stat = "Average", yAxis = "right", label = "Write IOPS" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
        }
      },

      # ==============================================================================
      # Row 5: Scheduler & Costs
      # ==============================================================================
      {
        type = "metric"
        x    = 0
        y    = 24
        width = 12
        height = 6
        properties = {
          title  = "Scheduler Lambda Invocations"
          region = var.aws_region
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.scheduler.function_name, { stat = "Sum", label = "Invocations" }],
            [".", "Errors", ".", ".", { stat = "Sum", label = "Errors" }],
            [".", "Duration", ".", ".", { stat = "Average", label = "Duration (ms)" }]
          ]
          view   = "timeSeries"
          stacked = false
          period = 300
        }
      },

      {
        type = "log"
        x    = 12
        y    = 24
        width = 12
        height = 6
        properties = {
          title  = "Recent Scheduler Logs"
          region = var.aws_region
          query  = <<-EOT
            SOURCE '/aws/lambda/${aws_lambda_function.scheduler.function_name}'
            | fields @timestamp, @message
            | filter @message like /===|✅|❌|ℹ️/
            | sort @timestamp desc
            | limit 20
          EOT
        }
      },

      # ==============================================================================
      # Row 6: Log Insights
      # ==============================================================================
      {
        type = "log"
        x    = 0
        y    = 30
        width = 12
        height = 6
        properties = {
          title  = "Auth Service Errors (Last Hour)"
          region = var.aws_region
          query  = <<-EOT
            SOURCE '/ecs/${var.environment}-club-auth'
            | fields @timestamp, @message
            | filter @message like /error|Error|ERROR/
            | sort @timestamp desc
            | limit 50
          EOT
        }
      },

      {
        type = "log"
        x    = 12
        y    = 30
        width = 12
        height = 6
        properties = {
          title  = "RabbitMQ Logs (Last Hour)"
          region = var.aws_region
          query  = <<-EOT
            SOURCE '/ecs/${var.environment}-club-rabbitmq'
            | fields @timestamp, @message
            | sort @timestamp desc
            | limit 50
          EOT
        }
      }
    ]
  })
}

# ==============================================================================
# CloudWatch Alarms
# ==============================================================================

# High CPU Alarm
resource "aws_cloudwatch_metric_alarm" "ecs_high_cpu" {
  alarm_name          = "${var.environment}-ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ECS CPU usage is too high"
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.auth.name
  }

  tags = local.common_tags
}

# RDS High CPU
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU usage is too high"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.auth_db.identifier
  }

  tags = local.common_tags
}

# Low Storage
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${var.environment}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000000000"  # 2 GB in bytes
  alarm_description   = "RDS storage is running low"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.auth_db.identifier
  }

  tags = local.common_tags
}

# Unhealthy Targets
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "${var.environment}-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Unhealthy targets detected"
  
  dimensions = {
    TargetGroup  = aws_lb_target_group.auth.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}

# ==============================================================================
# Outputs
# ==============================================================================

output "dashboard_url" {
  description = "CloudWatch Dashboard URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.staging.dashboard_name}"
}

output "alarms" {
  description = "CloudWatch Alarms created"
  value = {
    ecs_high_cpu      = aws_cloudwatch_metric_alarm.ecs_high_cpu.arn
    rds_high_cpu      = aws_cloudwatch_metric_alarm.rds_high_cpu.arn
    rds_low_storage   = aws_cloudwatch_metric_alarm.rds_low_storage.arn
    unhealthy_targets = aws_cloudwatch_metric_alarm.unhealthy_targets.arn
  }
}
