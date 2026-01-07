# AWS Application Load Balancer (ALB) Setup Guide

## Tổng quan

Thay thế Kong API Gateway bằng AWS Application Load Balancer khi deploy lên AWS. ALB cung cấp các tính năng tương tự Kong nhưng được quản lý hoàn toàn bởi AWS.

## So sánh Kong vs ALB

| Tính năng | Kong | AWS ALB |
|-----------|------|---------|
| Load Balancing | ✅ | ✅ |
| Path-based Routing | ✅ | ✅ |
| Health Checks | ✅ | ✅ |
| SSL/TLS Termination | ✅ | ✅ |
| Authentication | ✅ (JWT Plugin) | ✅ (Cognito Integration) |
| Rate Limiting | ✅ | ✅ (AWS WAF) |
| Managed Service | ❌ | ✅ |
| Cost | Self-hosted | Pay-per-use |

## Architecture với ALB

```
Internet
    ↓
AWS ALB (HTTPS)
    ↓
Target Groups:
    - /api/auth/* → Auth Service (ECS/EKS)
    - /api/clubs/* → Club Service (ECS/EKS)
    - /api/events/* → Event Service (ECS/EKS)
    - /api/images/* → Image Service (ECS/EKS)
    - /* → Frontend (ECS/CloudFront)
```

## Setup Steps

### 1. Tạo Target Groups

Tạo target group cho mỗi service:

```bash
# Auth Service Target Group
aws elbv2 create-target-group \
    --name club-mgmt-auth-tg \
    --protocol HTTP \
    --port 3001 \
    --vpc-id vpc-xxxxx \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3

# Club Service Target Group
aws elbv2 create-target-group \
    --name club-mgmt-club-tg \
    --protocol HTTP \
    --port 3002 \
    --vpc-id vpc-xxxxx \
    --health-check-path /health

# Event Service Target Group
aws elbv2 create-target-group \
    --name club-mgmt-event-tg \
    --protocol HTTP \
    --port 3003 \
    --vpc-id vpc-xxxxx \
    --health-check-path /health

# Notify Service Target Group
aws elbv2 create-target-group \
    --name club-mgmt-notify-tg \
    --protocol HTTP \
    --port 3005 \
    --vpc-id vpc-xxxxx \
    --health-check-path /health

# Image Service Target Group
aws elbv2 create-target-group \
    --name club-mgmt-image-tg \
    --protocol HTTP \
    --port 3004 \
    --vpc-id vpc-xxxxx \
    --health-check-path /health

# Frontend Target Group
aws elbv2 create-target-group \
    --name club-mgmt-frontend-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id vpc-xxxxx \
    --health-check-path /
```

### 2. Tạo Application Load Balancer

```bash
aws elbv2 create-load-balancer \
    --name club-management-alb \
    --subnets subnet-xxxxx subnet-yyyyy \
    --security-groups sg-xxxxx \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --tags Key=Environment,Value=production
```

### 3. Tạo HTTPS Listener với SSL Certificate

```bash
# Request SSL Certificate (ACM)
aws acm request-certificate \
    --domain-name api.yourdomain.com \
    --subject-alternative-names *.yourdomain.com \
    --validation-method DNS

# Create HTTPS Listener
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:region:account-id:loadbalancer/app/club-management-alb/xxxxx \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=arn:aws:acm:region:account-id:certificate/xxxxx \
    --default-actions Type=fixed-response,FixedResponseConfig={StatusCode=404}
```

### 4. Tạo Listener Rules cho Path-based Routing

```bash
# Auth Service Rule
aws elbv2 create-rule \
    --listener-arn arn:aws:elasticloadbalancing:region:account-id:listener/app/club-management-alb/xxxxx \
    --priority 10 \
    --conditions Field=path-pattern,Values='/api/auth/*' \
    --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account-id:targetgroup/club-mgmt-auth-tg/xxxxx

# Club Service Rule
aws elbv2 create-rule \
    --listener-arn arn:aws:elasticloadbalancing:region:account-id:listener/app/club-management-alb/xxxxx \
    --priority 20 \
    --conditions Field=path-pattern,Values='/api/clubs/*' \
    --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account-id:targetgroup/club-mgmt-club-tg/xxxxx

# Event Service Rule
aws elbv2 create-rule \
    --listener-arn arn:aws:elasticloadbalancing:region:account-id:listener/app/club-management-alb/xxxxx \
    --priority 30 \
    --conditions Field=path-pattern,Values='/api/events/*' \
    --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account-id:targetgroup/club-mgmt-event-tg/xxxxx

# Image Service Rule
aws elbv2 create-rule \
    --listener-arn arn:aws:elasticloadbalancing:region:account-id:listener/app/club-management-alb/xxxxx \
    --priority 40 \
    --conditions Field=path-pattern,Values='/api/images/*' \
    --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account-id:targetgroup/club-mgmt-image-tg/xxxxx

# Frontend Rule (default)
aws elbv2 modify-listener \
    --listener-arn arn:aws:elasticloadbalancing:region:account-id:listener/app/club-management-alb/xxxxx \
    --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account-id:targetgroup/club-mgmt-frontend-tg/xxxxx
```

### 5. Setup AWS WAF cho Rate Limiting

```bash
# Create Web ACL
aws wafv2 create-web-acl \
    --name club-management-waf \
    --scope REGIONAL \
    --default-action Allow={} \
    --rules file://waf-rules.json \
    --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=ClubManagementWAF

# Associate with ALB
aws wafv2 associate-web-acl \
    --web-acl-arn arn:aws:wafv2:region:account-id:regional/webacl/club-management-waf/xxxxx \
    --resource-arn arn:aws:elasticloadbalancing:region:account-id:loadbalancer/app/club-management-alb/xxxxx
```

### 6. Setup Cognito cho Authentication (thay JWT)

```bash
# Create User Pool
aws cognito-idp create-user-pool \
    --pool-name club-management-users \
    --auto-verified-attributes email \
    --policies PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}

# Create User Pool Client
aws cognito-idp create-user-pool-client \
    --user-pool-id xxxxx \
    --client-name club-management-app \
    --generate-secret

# Add Cognito Authentication to ALB Listener Rule
aws elbv2 modify-rule \
    --rule-arn arn:aws:elasticloadbalancing:region:account-id:listener-rule/app/club-management-alb/xxxxx \
    --actions Type=authenticate-cognito,AuthenticateCognitoConfig={UserPoolArn=arn:aws:cognito-idp:region:account-id:userpool/xxxxx,UserPoolClientId=xxxxx,UserPoolDomain=club-management}
```

## Terraform Configuration

Đã có sẵn trong `terraform/` directory. Cập nhật để thêm ALB:

```hcl
# terraform/alb.tf
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"

  tags = {
    Name        = "${var.project_name}-alb"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "services" {
  for_each = {
    auth   = { port = 3001, path = "/health" }
    club   = { port = 3002, path = "/health" }
    event  = { port = 3003, path = "/health" }
    notify = { port = 3005, path = "/health" }
    image  = { port = 3004, path = "/health" }
  }

  name     = "${var.project_name}-${each.key}-tg"
  port     = each.value.port
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = each.value.path
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener_rule" "auth" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["auth"].arn
  }

  condition {
    path_pattern {
      values = ["/api/auth/*"]
    }
  }
}

# Similar rules for other services...
```

## Jenkins Pipeline Changes

Pipeline đã được cập nhật để:
- ✅ Skip build Kong service
- ✅ Build chỉ các services cần thiết
- ✅ Test services trực tiếp (không qua Kong)
- ✅ Deploy services lên AWS ECS/EKS với ALB routing

## Migration Checklist

- [ ] Tạo ALB và Target Groups
- [ ] Cấu hình SSL Certificate (ACM)
- [ ] Setup Listener Rules cho routing
- [ ] Migrate JWT authentication sang Cognito (hoặc giữ JWT trong services)
- [ ] Setup WAF cho rate limiting
- [ ] Update DNS records trỏ đến ALB
- [ ] Test tất cả API endpoints qua ALB
- [ ] Update frontend API base URL
- [ ] Remove Kong từ docker-compose (cho local dev có thể giữ)
- [ ] Update monitoring/logging để track ALB metrics

## Cost Estimation

**ALB Pricing (us-east-1):**
- ALB Hour: $0.0225/hour (~$16/month)
- LCU (Load Balancer Capacity Units): $0.008/hour
- Data Processing: $0.008/GB

**Estimated Monthly Cost:**
- Small traffic: ~$30-50/month
- Medium traffic: ~$100-200/month
- High traffic: $200+/month

**So với Kong tự quản lý:**
- Kong: EC2 instance cost + management time
- ALB: Higher cost but fully managed, auto-scaling, HA

## Monitoring

```bash
# View ALB metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name TargetResponseTime \
    --dimensions Name=LoadBalancer,Value=app/club-management-alb/xxxxx \
    --start-time 2026-01-07T00:00:00Z \
    --end-time 2026-01-07T23:59:59Z \
    --period 3600 \
    --statistics Average

# View access logs (enable first)
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn arn:aws:elasticloadbalancing:region:account-id:loadbalancer/app/club-management-alb/xxxxx \
    --attributes Key=access_logs.s3.enabled,Value=true Key=access_logs.s3.bucket,Value=my-alb-logs
```

## References

- [AWS ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [ALB Listener Rules](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-update-rules.html)
- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
- [Cognito Integration with ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html)
