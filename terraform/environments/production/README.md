# Production Environment

Infrastructure configuration for the production environment of Club Management System.

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Terraform >= 1.6.0** installed
3. **Sensitive variables** set via environment variables or `terraform.tfvars.local`

## Directory Structure

```
environments/production/
├── main.tf              # Main infrastructure configuration
├── variables.tf         # Variable definitions
├── terraform.tfvars     # Default values (non-sensitive)
├── outputs.tf           # Output values
└── README.md            # This file
```

## Setup

### 1. Set Sensitive Variables

Create `terraform.tfvars.local` (gitignored):

```hcl
db_password        = "your-secure-db-password"
mq_password        = "your-secure-mq-password"
mongodb_uri        = "mongodb+srv://user:pass@cluster.mongodb.net/db"
jwt_refresh_secret = "your-jwt-secret-min-32-chars"
api_gateway_secret = "your-api-gateway-secret"
email_password     = "your-email-app-password"
```

Or export as environment variables:

```bash
export TF_VAR_db_password="your-secure-password"
export TF_VAR_mq_password="your-secure-password"
export TF_VAR_mongodb_uri="mongodb+srv://..."
export TF_VAR_jwt_refresh_secret="your-jwt-secret"
export TF_VAR_api_gateway_secret="your-api-secret"
export TF_VAR_email_password="your-email-password"
```

### 2. Initialize Terraform

```bash
cd terraform/environments/production
terraform init
```

### 3. Review Plan

```bash
terraform plan
```

### 4. Apply Configuration

```bash
terraform apply
```

## Workflow

### Initial Deployment

1. **Create Infrastructure** (without services):
   ```bash
   terraform apply -target=module.vpc -target=module.alb -target=module.databases
   ```

2. **Build and Push Docker Images** to ECR:
   ```bash
   # Get ECR URLs from outputs
   terraform output ecr_repositories
   
   # Login to ECR
   aws ecr get-login-password --region ap-southeast-1 | \
     docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com
   
   # Build and push each service
   docker build -t <ecr-url>:latest ./services/auth
   docker push <ecr-url>:latest
   ```

3. **Deploy Services**:
   ```bash
   terraform apply
   ```

### Updates

#### Update Service Image

```bash
# Update terraform.tfvars
auth_service_image = "<ecr-url>:v1.2.3"

# Apply changes
terraform apply -target=module.auth_service
```

#### Scale Services

```bash
# In main.tf, update desired_count
module "auth_service" {
  ...
  desired_count = 2  # Scale to 2 instances
}

terraform apply -target=module.auth_service
```

## Accessing Resources

### Application URL

```bash
terraform output alb_url
# Visit: http://<alb-dns-name>
```

### Bastion SSH

```bash
# Get bastion IP
terraform output bastion_public_ip

# Get private key
terraform output -raw bastion_private_key > bastion-key.pem
chmod 400 bastion-key.pem

# SSH to bastion
ssh -i bastion-key.pem ec2-user@<bastion-ip>
```

### Database Access via Bastion

```bash
# SSH tunnel for PostgreSQL
ssh -i bastion-key.pem -L 5432:<rds-endpoint>:5432 ec2-user@<bastion-ip>

# Connect from local machine
psql -h localhost -U dbadmin -d auth_db
```

### RabbitMQ Management Console

```bash
terraform output mq_console_url
# Access via SSH tunnel through bastion
```

## Cleanup

```bash
# Destroy all resources
terraform destroy

# Destroy specific resources
terraform destroy -target=module.auth_service
```

## Important Notes

### Cost Optimization

- **Single NAT Gateway**: Saves ~$32/month but no HA
- **Single AZ RDS**: Saves ~$15/month but no HA
- **t3.micro instances**: Free tier eligible

### Production Hardening

Update these for production:

```hcl
single_nat_gateway         = false  # Enable HA
rds_multi_az               = true   # Enable HA
rds_skip_final_snapshot    = false  # Keep backups
enable_deletion_protection = true   # Prevent accidental deletion
mq_deployment_mode         = "ACTIVE_STANDBY_MULTI_AZ"

bastion_allowed_cidr_blocks = ["YOUR_IP/32"]  # Restrict SSH access
```

### State Management

For production, use S3 backend:

```hcl
terraform {
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "production/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

## Troubleshooting

### Service Won't Start

```bash
# Check ECS logs
aws ecs describe-services \
  --cluster production-club-cluster \
  --services auth-service

# View CloudWatch logs
aws logs tail /ecs/auth-service --follow
```

### Can't Access Application

1. Check ALB target health:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn <target-group-arn>
   ```

2. Verify security groups allow traffic

3. Check service logs in CloudWatch

## Module Sources

- VPC: `terraform-aws-modules/vpc/aws`
- Custom modules: `../../modules/`
