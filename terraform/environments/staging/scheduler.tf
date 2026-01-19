# ==============================================================================
# Scheduler Lambda Function - Auto Stop/Start Staging Environment
# ==============================================================================

# Lambda IAM Role
resource "aws_iam_role" "scheduler_lambda_role" {
  name = "${var.environment}-scheduler-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Lambda IAM Policy
resource "aws_iam_role_policy" "scheduler_lambda_policy" {
  name = "${var.environment}-scheduler-lambda-policy"
  role = aws_iam_role.scheduler_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:ListServices"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:StopDBInstance",
          "rds:StartDBInstance",
          "rds:DescribeDBInstances"
        ]
        Resource = aws_db_instance.auth_db.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda Function
resource "aws_lambda_function" "scheduler" {
  filename      = "${path.module}/scheduler-lambda.zip"
  function_name = "${var.environment}-staging-scheduler"
  role          = aws_iam_role.scheduler_lambda_role.arn
  handler       = "scheduler-lambda.lambda_handler"
  runtime       = "python3.11"
  timeout       = 60
  memory_size   = 128

  source_code_hash = filebase64sha256("${path.module}/scheduler-lambda.zip")

  environment {
    variables = {
      ECS_CLUSTER_NAME = aws_ecs_cluster.main.name
      RDS_INSTANCE_ID  = aws_db_instance.auth_db.identifier
      ECS_SERVICES     = "${aws_ecs_service.auth.name},${aws_ecs_service.rabbitmq.name}"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.environment}-staging-scheduler"
  })
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "scheduler_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.scheduler.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# ==============================================================================
# EventBridge Rules - Schedule Stop/Start
# ==============================================================================

# Stop at 7 PM (Mon-Fri)
resource "aws_cloudwatch_event_rule" "stop_staging" {
  name                = "${var.environment}-stop-7pm"
  description         = "Stop staging environment at 7 PM (Mon-Fri)"
  schedule_expression = "cron(0 19 ? * MON-FRI *)"  # 7 PM Singapore time (UTC+8 = 11 AM UTC)

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "stop_staging" {
  rule      = aws_cloudwatch_event_rule.stop_staging.name
  target_id = "StopStagingLambda"
  arn       = aws_lambda_function.scheduler.arn

  input = jsonencode({
    action = "stop"
  })
}

resource "aws_lambda_permission" "allow_eventbridge_stop" {
  statement_id  = "AllowExecutionFromEventBridgeStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_staging.arn
}

# Start at 7 AM (Mon-Fri)
resource "aws_cloudwatch_event_rule" "start_staging" {
  name                = "${var.environment}-start-7am"
  description         = "Start staging environment at 7 AM (Mon-Fri)"
  schedule_expression = "cron(0 7 ? * MON-FRI *)"  # 7 AM Singapore time (UTC+8 = 11 PM previous day UTC)

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "start_staging" {
  rule      = aws_cloudwatch_event_rule.start_staging.name
  target_id = "StartStagingLambda"
  arn       = aws_lambda_function.scheduler.arn

  input = jsonencode({
    action = "start"
  })
}

resource "aws_lambda_permission" "allow_eventbridge_start" {
  statement_id  = "AllowExecutionFromEventBridgeStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_staging.arn
}

# ==============================================================================
# Manual Invoke (for testing)
# ==============================================================================

output "scheduler_lambda_arn" {
  description = "Lambda function ARN for manual invocation"
  value       = aws_lambda_function.scheduler.arn
}

output "scheduler_test_commands" {
  description = "Commands to test scheduler manually"
  value = <<-EOT
    # Test STOP manually:
    aws lambda invoke \
      --function-name ${aws_lambda_function.scheduler.function_name} \
      --payload '{"action":"stop"}' \
      response.json && cat response.json
    
    # Test START manually:
    aws lambda invoke \
      --function-name ${aws_lambda_function.scheduler.function_name} \
      --payload '{"action":"start"}' \
      response.json && cat response.json
    
    # View logs:
    aws logs tail /aws/lambda/${aws_lambda_function.scheduler.function_name} --follow
  EOT
}
