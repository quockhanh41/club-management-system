# Staging Environment - Setup Checklist

## ✅ Pre-Deployment Checklist

### 1. MongoDB Atlas Setup
- [ ] Create MongoDB Atlas account (free)
- [ ] Create M0 Free cluster in Singapore region
- [ ] Create database user: `staging_user`
- [ ] Add IP whitelist: `0.0.0.0/0` (for staging)
- [ ] Get connection string and add to `terraform.tfvars.local`

### 2. AWS Prerequisites
- [ ] AWS CLI installed and configured
- [ ] AWS credentials with proper permissions
- [ ] Terraform >= 1.6.0 installed

### 3. Secrets Configuration
- [x] `terraform.tfvars.local` created with:
  - [x] db_password
  - [x] mq_password
  - [x] mongodb_uri
  - [x] jwt_refresh_secret
  - [x] api_gateway_secret
  - [ ] email_password (optional)
  - [ ] cloudinary credentials (optional)

### 4. Docker Images
- [ ] Push initial Docker images to registry
  - [ ] club-auth-service:staging
  - [ ] club-club-service:staging  
  - [ ] club-event-service:staging
  - [ ] club-image-service:staging
  - [ ] club-notify-service:staging
  - [ ] club-frontend:staging

### 5. Database Seeding (Automated!)
- ✅ **No manual seeding required!**
- Database seeding now happens automatically via Post-Merge Pipeline
- See [DATABASE-SEEDING-GUIDE.md](DATABASE-SEEDING-GUIDE.md) for details

---

## 🚀 Deployment Steps

### Step 1: Package Lambda Function

```bash
cd terraform/environments/staging
./package-lambda.sh
```

**Expected output:**
- ✅ `scheduler-lambda.zip` created
- Package size: ~2-3 KB

### Step 2: Initialize Terraform

```bash
terraform init
```

**Expected output:**
- Terraform initialized
- Provider plugins downloaded
- Backend initialized

### Step 3: Review Plan

```bash
terraform plan
```

**Review:**
- [ ] VPC and networking (2 AZs, NAT Gateway)
- [ ] ECS cluster and services
- [ ] RDS PostgreSQL instance
- [ ] Application Load Balancer
- [ ] Lambda scheduler function
- [ ] EventBridge rules
- [ ] CloudWatch dashboard
- [ ] Security groups and IAM roles

**Expected resources:** ~50-60 resources to create

### Step 4: Deploy Infrastructure

```bash
terraform apply
```

**Duration:** ~10-15 minutes

**Expected outputs:**
```
vpc_id = "vpc-xxxxx"
alb_dns_name = "staging-club-alb-xxxxx.ap-southeast-1.elb.amazonaws.com"
rds_endpoint = "staging-club-auth-db.xxxxx.ap-southeast-1.rds.amazonaws.com:5432"
ecs_cluster_name = "staging-club-cluster"
dashboard_url = "https://console.aws.amazon.com/cloudwatch/..."
scheduler_test_commands = "..."
```

### Step 5: Save Outputs

```bash
terraform output > staging-deployment.txt
cat staging-deployment.txt
```

### Step 6: Test Scheduler (Optional)

```bash
# Test STOP manually
aws lambda invoke \
  --function-name staging-staging-scheduler \
  --payload '{"action":"stop"}' \
  response.json && cat response.json

# Wait 2 minutes

# Test START manually
aws lambda invoke \
  --function-name staging-staging-scheduler \
  --payload '{"action":"start"}' \
  response.json && cat response.json

# View scheduler logs
aws logs tail /aws/lambda/staging-staging-scheduler --follow
```

### Step 7: Setup GitHub Secrets

Add these to GitHub repository: **Settings → Secrets → Actions**

```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-token
```

### Step 8: Test Post-Merge Pipeline

```bash
# Push to develop branch
git checkout develop
git pull origin develop

# Make a test change
echo "# Test staging deployment" >> README.md
git add README.md
git commit -m "test: Trigger staging deployment"
git push origin develop
```

**Monitor:**
- GitHub Actions: Post-Merge Pipeline
- ECS service updates
- CloudWatch logs

---

## 🔍 Post-Deployment Verification

### 1. Check Infrastructure

```bash
# ECS Cluster
aws ecs describe-clusters --clusters staging-club-cluster

# ECS Services
aws ecs list-services --cluster staging-club-cluster

# RDS Status
aws rds describe-db-instances --db-instance-identifier staging-club-auth-db

# ALB Status
aws elbv2 describe-load-balancers --names staging-club-alb
```

### 2. Test Endpoints

```bash
# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test ALB
curl http://$ALB_DNS

# Test Auth Service (after deployment)
curl http://$ALB_DNS/api/auth/health

# Test with verbose
curl -v http://$ALB_DNS/api/auth/health
```

### 3. View Logs

```bash
# Auth service logs
aws logs tail /ecs/staging-club-auth --follow

# RabbitMQ logs
aws logs tail /ecs/staging-club-rabbitmq --follow

# Scheduler logs
aws logs tail /aws/lambda/staging-staging-scheduler --follow
```

### 4. Access Dashboard

```bash
# Get dashboard URL
terraform output dashboard_url

# Or build manually
echo "https://console.aws.amazon.com/cloudwatch/home?region=ap-southeast-1#dashboards:name=staging-club-management"
```

**Dashboard includes:**
- ECS metrics (CPU, Memory, Tasks)
- ALB metrics (Requests, Response times, HTTP codes)
- RDS metrics (CPU, Memory, Connections, Storage)
- Scheduler invocations
- Log insights

### 5. Verify Scheduler

```bash
# Check EventBridge rules
aws events list-rules --name-prefix staging-

# Check next scheduled times
aws events describe-rule --name staging-start-7am
aws events describe-rule --name staging-stop-7pm
```

**Schedule:**
- Start: 7:00 AM Mon-Fri (Singapore time)
- Stop: 7:00 PM Mon-Fri (Singapore time)

---

## 💰 Cost Monitoring

### View Current Costs

```bash
# Last 7 days cost
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --filter file://<(echo '{"Tags":{"Key":"Environment","Values":["staging"]}}')

# Cost by service
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --filter file://<(echo '{"Tags":{"Key":"Environment","Values":["staging"]}}')
```

### Setup Cost Alerts

```bash
# Create monthly budget ($80)
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json

# budget.json content in separate file
```

### Expected Monthly Costs

| Component | Cost (24/7) | Cost (12h/day, Mon-Fri) |
|-----------|-------------|-------------------------|
| ECS Tasks | $13.00 | $4.30 |
| RDS | $12.00 | $4.00 |
| NAT Gateway | $32.00 | $32.00 |
| ALB | $16.00 | $16.00 |
| Other | $7.00 | $7.00 |
| **Total** | **$80.00** | **~$63.00** |

---

## 🧹 Maintenance Tasks

### Weekly Tasks

```bash
# Check CloudWatch alarms
aws cloudwatch describe-alarms --state-value ALARM

# Review ECS service events
aws ecs describe-services \
  --cluster staging-club-cluster \
  --services staging-club-auth \
  --query 'services[0].events[0:10]'

# Check RDS storage
aws rds describe-db-instances \
  --db-instance-identifier staging-club-auth-db \
  --query 'DBInstances[0].AllocatedStorage'
```

### Monthly Tasks

```bash
# Review and rotate secrets
# Update terraform.tfvars.local with new passwords
terraform apply

# Review cost report
# Check AWS Cost Explorer

# Update base images
# Rebuild and redeploy services
```

---

## 🆘 Troubleshooting

### Issue: Services Not Starting

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster staging-club-cluster \
  --services staging-club-auth

# Check task logs
aws logs tail /ecs/staging-club-auth --since 1h

# Check task failures
aws ecs list-tasks \
  --cluster staging-club-cluster \
  --desired-status STOPPED \
  --max-items 10
```

### Issue: RDS Connection Failed

```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier staging-club-auth-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Check security group rules
aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=staging-db-sg"

# Test connection from ECS task
aws ecs execute-command \
  --cluster staging-club-cluster \
  --task <task-id> \
  --container auth \
  --interactive \
  --command "/bin/sh"
```

### Issue: Scheduler Not Running

```bash
# Check Lambda function
aws lambda get-function --function-name staging-staging-scheduler

# Check EventBridge rules
aws events list-rules --name-prefix staging-

# Test manually
aws lambda invoke \
  --function-name staging-staging-scheduler \
  --payload '{"action":"start"}' \
  output.json

# Check logs
aws logs tail /aws/lambda/staging-staging-scheduler --since 1h
```

### Issue: High Costs

```bash
# Check NAT Gateway data transfer
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name BytesOutToDestination \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum \
  --dimensions Name=NatGatewayId,Value=<nat-gateway-id>

# Review CloudWatch logs ingestion
aws logs describe-log-groups \
  --query 'logGroups[?starts_with(logGroupName, `/ecs/staging`)].{Name:logGroupName,Size:storedBytes}'
```

---

## 🗑️ Cleanup / Destroy

### Before Destroying

```bash
# Backup important data
# - RDS snapshot (optional, done automatically if configured)
# - Export logs
# - Save configuration

# Stop all services first (optional)
aws lambda invoke \
  --function-name staging-staging-scheduler \
  --payload '{"action":"stop"}' \
  response.json
```

### Destroy Infrastructure

```bash
cd terraform/environments/staging

# Review what will be destroyed
terraform plan -destroy

# Destroy (confirm with 'yes')
terraform destroy
```

**Note:** This will delete:
- ✅ All ECS services and tasks
- ✅ RDS instance (no final snapshot in staging config)
- ✅ Load Balancer and target groups
- ✅ Lambda function and EventBridge rules
- ✅ VPC and all networking
- ✅ CloudWatch logs and dashboard
- ❌ MongoDB Atlas (manual delete required)
- ❌ Docker images in registry (manual cleanup)

### Manual Cleanup

```bash
# Delete MongoDB Atlas cluster
# Go to: https://cloud.mongodb.com/

# Delete Docker images (if needed)
# Go to Docker Hub or run:
docker rmi club-auth-service:staging
# ... other images

# Delete terraform state (if using local state)
rm -rf .terraform
rm terraform.tfstate*
```

---

## 📚 Additional Resources

- [AWS Cost Optimization Guide](../../docs/aws-staging-cost-optimization.md)
- [Pipeline Architecture](../../docs/pipeline-architecture.md)
- [Post-Merge Pipeline](../../.github/workflows/README-post-merge.md)
- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)

---

**Last Updated:** January 19, 2026  
**Status:** ✅ Ready for deployment  
**Maintainer:** DevOps Team
