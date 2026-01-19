# AWS Migration Walkthrough - Final Report

## Target Infrastructure Overview
Based on the code analysis and "AWS-Ready" implementation, here is the recommended infrastructure stack for your project:

### Global Resources
- **Compute**: AWS App Runner (Recommended for ease of use) or Amazon ECS Fargate (for more control).
- **Message Queue**: Amazon MQ (RabbitMQ).
- **API Gateway**: Kong (Self-hosted on EC2/ECS) or AWS API Gateway.

### Service-Specific Infrastructure
| Service | Compute | Database | Storage | Key Features |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | App Runner | **AWS RDS** (PostgreSQL) | - | JWT Keys via Parameter Store |
| **Club** | App Runner | **MongoDB Atlas** (Recommended) or DocumentDB | - | - |
| **Event** | App Runner | **MongoDB Atlas** or DocumentDB | - | Internal Cron Jobs |
| **Notify** | App Runner | - | - | **AWS SES** (for SMTP) |
| **Image** | App Runner | - | **Cloudinary** (SaaS) | Uses Cloudinary API |


--- 

## Detailed Service Changes

### Auth Service
- **Refactor**: Enabled loading JWT keys from environment variables (Content-based).
- **Security**: Ready for AWS Systems Manager Parameter Store.

### Club Service
- **Refactor**: Centralized `joi` configuration.
- **DB**: Verified connection to MongoDB Atlas.

### Event Service
- **Refactor**: Implemented ESM-based ConfigManager.
- **Config**: Standardized DB and Port configuration.

### Notify Service
- **Refactor**: Standardized ConfigManager.
- **Resilience**: Fail-fast logic for RabbitMQ connections.

### Image Service
- **Storage**: Confirmed Cloudinary usage (No S3 migration needed).
- **Config**: Validated API Keys via ConfigManager.


---

# 🚀 AWS Production Deployment Guide

## 1. Provision Infrastructure (Terraform)
Navigate to the `terraform/` directory and run:
```bash
cd terraform
# Initialize Terraform
terraform init

# Plan and Review Changes. You will be asked for DB passwords.
terraform plan -var="db_password=YourSecureDbPass123" -var="mq_password=YourSecureRabbitPass123"

# Apply Changes (Creates VPC, RDS, DocDB, App Runner, etc.)
terraform apply -var="db_password=YourSecureDbPass123" -var="mq_password=YourSecureRabbitPass123"
```
> [!IMPORTANT]
> Save the **Outputs** from the apply step (RDS Endpoint, DocDB Endpoint, ECR URLs, Bastion IP).
>
> **CRITICAL STAGE**: Extract the SSH Key for Bastion Host:
> ```bash
> terraform output -raw private_key_pem > club-ssh-key.pem
> chmod 400 club-ssh-key.pem
> ```

## 2. Seed Databases (via Bastion Host)
Since databases are in **private subnets**, use the Bastion Host to tunnel connection.

1.  **Open SSH Tunnel**:
    ```bash
    # Replace <BASTION_IP>, <RDS_ENDPOINT>, <DOCDB_ENDPOINT> with Terraform outputs
    ssh -i "club-ssh-key.pem" -N \
        -L 5432:<RDS_ENDPOINT>:5432 \
        -L 27017:<DOCDB_ENDPOINT>:27017 \
        ec2-user@<BASTION_IP>
    ```
    *Keep this terminal open.*

2.  **Run Seed Scripts**:
    Open a new terminal, navigate to `database_script/`:
    ```bash
    cd database_script
    # Configure .env to point to localhost (tunnelled ports)
    export DB_HOST=localhost
    export DB_PORT=5432
    export MONGO_URI="mongodb://docdb_admin:YourSecureDbPass123@localhost:27017/..."
    
    # Run the Python scripts
    python3 setup_database_environment.py
    python3 seed_all_services_enhanced_v3.py
    ```

## 3. Deploy Services (ECR Push)
App Runner is configured to **auto-deploy** when a new image is pushed.

Authenticate Docker to ECR:
```bash
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com
```

For each service (e.g., Auth Service):
```bash
# 1. Build (IMPORTANT: Must use --platform linux/amd64 for AWS Fargate)
docker build --platform linux/amd64 -t club-auth-service ./services/auth

# 2. Tag
docker tag club-auth-service:latest 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-auth-service:latest

# 3. Push (Triggers App Runner/ECS Deployment)
docker push 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-auth-service:latest
```
*Repeat for all 5 services.*

# club service
docker build --platform linux/amd64 -t club-club-service ./services/club
docker tag club-club-service:latest 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-club-service:latest
docker push 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-club-service:latest

# event service
docker build --platform linux/amd64 -t club-event-service ./services/event
docker tag club-event-service:latest 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-event-service:latest
docker push 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-event-service:latest

# notify service
docker build --platform linux/amd64 -t club-notify-service ./services/notify
docker tag club-notify-service:latest 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-notify-service:latest
docker push 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-notify-service:latest

# image service
docker build --platform linux/amd64 -t club-image-service ./services/image
docker tag club-image-service:latest 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-image-service:latest
docker push 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-image-service:latest




# 1. Vào thư mục frontend
cd frontend

# 2. Tạo file env production trỏ về ALB
echo "NEXT_PUBLIC_API_BASE_URL=http://club-alb-242294839.ap-southeast-1.elb.amazonaws.com" > .env.production

# 3. Đăng nhập vào AWS ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com

# 4. Build Docker Image (Platform linux/amd64 cho Fargate)
# Lưu ý: Quá trình này có thể mất vài phút
docker build --platform linux/amd64 -t club-frontend .

# 5. Tag và Push lên ECR
docker tag club-frontend:latest 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-frontend:latest
docker push 911167910785.dkr.ecr.ap-southeast-1.amazonaws.com/club-frontend:latest

# 6. Force Update Service để nhận image mới ngay lập tức
aws ecs update-service --cluster club-management-cluster --service club-frontend-service --force-new-deployment