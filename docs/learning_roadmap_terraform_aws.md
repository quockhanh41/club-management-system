# 🎓 LỘ TRÌNH HỌC TERRAFORM & AWS - CLUB MANAGEMENT SYSTEM

**Mục tiêu**: Hiểu rõ toàn bộ infrastructure của dự án Club Management System được deploy trên AWS bằng Terraform

**Thời gian ước tính**: 8-10 tuần (2-3 giờ/ngày)

---

## 📋 KIẾN TRÚC TỔNG QUAN CỦA DỰ ÁN

```
                    ┌─────────────┐
                    │  Internet   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────────────┐
                    │  Application Load   │  (Public Subnet)
                    │     Balancer        │
                    └──────┬──────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐
    │Frontend │     │   Auth    │    │   Club    │  (Private Subnet)
    │ Service │     │  Service  │    │  Service  │
    │ (ECS)   │     │   (ECS)   │    │   (ECS)   │
    └────┬────┘     └─────┬─────┘    └─────┬─────┘
         │                │                 │
         └────────────────┼─────────────────┘
                          │
         ┌────────────────┼─────────────────┐
         │                │                 │
    ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐
    │   RDS   │     │  RabbitMQ │    │  MongoDB  │  (Private Subnet)
    │(Postgres)     │  (MQ)     │    │  (Atlas)  │
    └─────────┘     └───────────┘    └───────────┘
```

**Key Resources**:
- **5 Microservices**: Auth, Club, Event, Image, Notify
- **1 Frontend**: Next.js
- **3 Databases**: RDS (PostgreSQL), MongoDB Atlas, RabbitMQ
- **1 Bastion Host**: SSH access to private resources

---

## 🗓️ TUẦN 1-2: TERRAFORM FOUNDATIONS

### 📚 Kiến thức cần học

#### 1.1 Terraform Core Concepts
- [ ] **Providers**: Khai báo cloud provider (AWS, GCP, Azure)
- [ ] **Resources**: Các thành phần infrastructure (VPC, EC2, RDS)
- [ ] **Variables**: Input parameters cho Terraform
- [ ] **Outputs**: Export values sau khi apply
- [ ] **State File**: Terraform lưu trạng thái như thế nào
- [ ] **Modules**: Tái sử dụng code

#### 1.2 Terraform Commands
```bash
# Khởi tạo project
terraform init

# Xem preview thay đổi
terraform plan

# Áp dụng thay đổi
terraform apply

# Xóa infrastructure
terraform destroy

# Format code
terraform fmt

# Validate syntax
terraform validate

# Show state
terraform show
```

### 🎯 Thực hành

**Exercise 1: Tạo S3 bucket đơn giản**
```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-learning-bucket-${random_id.bucket_id.hex}"
  
  tags = {
    Name        = "My Learning Bucket"
    Environment = "Dev"
  }
}

resource "random_id" "bucket_id" {
  byte_length = 4
}

output "bucket_name" {
  value = aws_s3_bucket.my_bucket.id
}
```

**Practice Steps**:
1. Tạo thư mục `learning-terraform/`
2. Copy code trên vào `main.tf`
3. Chạy `terraform init`
4. Chạy `terraform plan` và đọc output
5. Chạy `terraform apply`
6. Check AWS Console xem bucket đã tạo chưa
7. Chạy `terraform destroy` để cleanup

**Exercise 2: Sử dụng Variables**
```hcl
# variables.tf
variable "region" {
  description = "AWS Region"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

# main.tf - Update provider
provider "aws" {
  region = var.region
  
  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

Chạy với variable:
```bash
terraform apply -var="environment=dev"
```

### 📖 Tài liệu học

- [ ] [Terraform Tutorial - HashiCorp Learn](https://learn.hashicorp.com/terraform)
- [ ] [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ ] Video: "Terraform in 100 seconds" - Fireship
- [ ] Đọc file dự án: [main.tf](../terraform/main.tf), [variables.tf](../terraform/variables.tf)

### ✅ Checkpoint
- [ ] Hiểu được Terraform workflow (init → plan → apply → destroy)
- [ ] Biết cách dùng variables và outputs
- [ ] Tạo được 1 AWS resource đơn giản bằng Terraform
- [ ] Đọc hiểu được [main.tf](../terraform/main.tf) của dự án

---

## 🗓️ TUẦN 3-4: AWS NETWORKING FUNDAMENTALS

### 📚 Kiến thức cần học

#### 2.1 VPC (Virtual Private Cloud)
- [ ] **CIDR Notation**: `10.0.0.0/16` nghĩa là gì?
  - `/16` = 65,536 IPs (10.0.0.0 → 10.0.255.255)
  - `/24` = 256 IPs (10.0.1.0 → 10.0.1.255)
- [ ] **VPC Components**:
  - Internet Gateway (IGW)
  - Route Tables
  - Network ACLs

#### 2.2 Subnets
- [ ] **Public Subnet**: 
  - Có route tới Internet Gateway
  - Dùng cho: ALB, Bastion Host, NAT Gateway
- [ ] **Private Subnet**:
  - Không có direct route tới Internet
  - Dùng cho: ECS Tasks, Databases
  - Outbound qua NAT Gateway

#### 2.3 Availability Zones (AZs)
- [ ] Multi-AZ deployment cho high availability
- [ ] Trong dự án: `ap-southeast-1a`, `ap-southeast-1b`, `ap-southeast-1c`

#### 2.4 Security Groups
- [ ] **Stateful Firewall**: Ingress/Egress rules
- [ ] **Security Group Chaining**: SG reference SG khác
- [ ] **Best Practice**: Least privilege access

### 🎯 Thực hành

**Exercise 3: Tạo VPC đơn giản**
```hcl
# Create VPC
resource "aws_vpc" "learning_vpc" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = { Name = "learning-vpc" }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.learning_vpc.id
  cidr_block              = "10.1.1.0/24"
  availability_zone       = "ap-southeast-1a"
  map_public_ip_on_launch = true
  
  tags = { Name = "public-subnet-1a" }
}

# Private Subnet
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.learning_vpc.id
  cidr_block        = "10.1.2.0/24"
  availability_zone = "ap-southeast-1a"
  
  tags = { Name = "private-subnet-1a" }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.learning_vpc.id
  tags   = { Name = "learning-igw" }
}

# Route Table for Public Subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.learning_vpc.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  
  tags = { Name = "public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

output "vpc_id" {
  value = aws_vpc.learning_vpc.id
}
```

**Practice Steps**:
1. Deploy VPC trên
2. Vào AWS Console → VPC Dashboard
3. Check: VPC, Subnets, IGW, Route Tables
4. Vẽ diagram kiến trúc đã tạo

**Exercise 4: Security Group**
```hcl
# Web Server Security Group
resource "aws_security_group" "web_sg" {
  name        = "web-server-sg"
  description = "Allow HTTP traffic"
  vpc_id      = aws_vpc.learning_vpc.id
  
  # Allow inbound HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = { Name = "web-sg" }
}

# Database Security Group (only from web SG)
resource "aws_security_group" "db_sg" {
  name        = "database-sg"
  description = "Allow PostgreSQL from web servers"
  vpc_id      = aws_vpc.learning_vpc.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web_sg.id]
  }
  
  tags = { Name = "db-sg" }
}
```

### 📖 Tài liệu học

- [ ] [AWS VPC Fundamentals](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html)
- [ ] [CIDR Calculator](https://cidr.xyz/)
- [ ] Video: "AWS VPC Beginner to Pro" - freeCodeCamp
- [ ] Đọc file dự án: [vpc.tf](../terraform/vpc.tf)

### ✅ Checkpoint
- [ ] Vẽ được diagram VPC của dự án
- [ ] Giải thích được tại sao ECS tasks ở private subnet
- [ ] Hiểu security group chaining trong [vpc.tf](../terraform/vpc.tf#L25-L78)
- [ ] Tính được số IP addresses của subnet `10.0.1.0/24`

**Quiz**:
1. Subnet `10.0.0.0/16` có bao nhiêu IPs? → 65,536
2. Tại sao database nên ở private subnet? → Security, không expose ra internet
3. NAT Gateway làm gì? → Cho private subnet có outbound internet

---

## 🗓️ TUẦN 5-6: AWS COMPUTE & CONTAINERS

### 📚 Kiến thức cần học

#### 3.1 Docker Basics (prerequisite)
- [ ] Images vs Containers
- [ ] Dockerfile
- [ ] Docker build, run, push
- [ ] Docker Hub vs AWS ECR

#### 3.2 ECR (Elastic Container Registry)
- [ ] Push/Pull images
- [ ] Image tags và versioning
- [ ] Private registry

#### 3.3 ECS (Elastic Container Service)
- [ ] **ECS Cluster**: Logical group
- [ ] **Task Definition**: Container blueprint
  - CPU/Memory allocation
  - Container image
  - Environment variables
  - Port mappings
  - Log configuration
- [ ] **ECS Service**: Maintain task count
  - Desired count
  - Auto-restart
  - Rolling updates
- [ ] **Fargate**: Serverless compute
  - Không cần manage EC2 instances
  - Pay per task

#### 3.4 IAM for ECS
- [ ] Task Execution Role: Pull images, write logs
- [ ] Task Role: Application permissions

### 🎯 Thực hành

**Exercise 5: Deploy Node.js app to ECS**

Step 1: Tạo simple Node.js app
```javascript
// app.js
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from ECS!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
```

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```

Step 2: Build và push to ECR
```bash
# Build image
docker build -t my-app .

# Authenticate to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com

# Tag and push
docker tag my-app:latest <ecr-url>:latest
docker push <ecr-url>:latest
```

Step 3: Deploy with Terraform
```hcl
# ECR Repository
resource "aws_ecr_repository" "app_repo" {
  name         = "learning-app"
  force_delete = true
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "learning-cluster"
}

# Task Definition
resource "aws_ecs_task_definition" "app_task" {
  family                   = "learning-app-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  
  container_definitions = jsonencode([{
    name      = "app-container"
    image     = "${aws_ecr_repository.app_repo.repository_url}:latest"
    essential = true
    
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
    
    environment = [
      { name = "NODE_ENV", value = "production" }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app_logs.name
        "awslogs-region"        = "ap-southeast-1"
        "awslogs-stream-prefix" = "app"
      }
    }
  }])
}

# ECS Service
resource "aws_ecs_service" "app_service" {
  name            = "learning-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = [aws_subnet.private.id]
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/ecs/learning-app"
  retention_in_days = 7
}

# IAM Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "learning-ecs-task-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
```

**Practice Steps**:
1. Tạo app trên và deploy to ECR
2. Apply Terraform để tạo ECS service
3. Check ECS Console → Tasks đang running
4. Check CloudWatch Logs xem logs
5. Update code → rebuild image → update service

### 📖 Tài liệu học

- [ ] [Docker Tutorial](https://docs.docker.com/get-started/)
- [ ] [AWS ECS Developer Guide](https://docs.aws.amazon.com/ecs/)
- [ ] [Fargate Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [ ] Đọc file dự án: [services.tf](../terraform/services.tf) (Auth Service)

### ✅ Checkpoint
- [ ] Build và push được Docker image to ECR
- [ ] Deploy được 1 container lên ECS Fargate
- [ ] Hiểu task definition trong [services.tf](../terraform/services.tf#L148-L189)
- [ ] Xem được logs trong CloudWatch

**Quiz**:
1. Fargate vs EC2 launch type khác gì? → Fargate serverless, EC2 manage instances
2. Task Execution Role dùng để làm gì? → Pull images, write logs
3. `network_mode = "awsvpc"` nghĩa là gì? → Mỗi task có ENI riêng

---

## 🗓️ TUẦN 7: AWS LOAD BALANCING

### 📚 Kiến thức cần học

#### 4.1 Application Load Balancer (ALB)
- [ ] **Layer 7 Load Balancer**: HTTP/HTTPS routing
- [ ] **Listeners**: Listen trên port (80, 443)
- [ ] **Target Groups**: Nhóm targets nhận traffic
- [ ] **Health Checks**: Check target health
- [ ] **Listener Rules**: Route based on path/host

#### 4.2 ALB Routing Patterns
```
Request: GET /api/auth/login
    ↓
ALB Listener (Port 80)
    ↓
Rule Priority 10: /api/auth* → Auth Target Group → Auth ECS Service
Rule Priority 20: /api/clubs* → Club Target Group → Club ECS Service
Rule Priority 100: /* → Frontend Target Group → Frontend ECS Service
```

### 🎯 Thực hành

**Exercise 6: ALB + ECS Integration**

```hcl
# ALB Security Group
resource "aws_security_group" "alb_sg" {
  name        = "learning-alb-sg"
  vpc_id      = aws_vpc.learning_vpc.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Tasks Security Group
resource "aws_security_group" "ecs_tasks_sg" {
  name        = "learning-ecs-tasks-sg"
  vpc_id      = aws_vpc.learning_vpc.id
  
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "learning-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

# Target Group
resource "aws_lb_target_group" "app_tg" {
  name        = "learning-app-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.learning_vpc.id
  target_type = "ip"
  
  health_check {
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }
}

# Update ECS Service to connect to ALB
resource "aws_ecs_service" "app_service" {
  name            = "learning-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app_task.arn
  desired_count   = 2  # Scale to 2 tasks
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = [aws_subnet.private.id]
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.app_tg.arn
    container_name   = "app-container"
    container_port   = 3000
  }
  
  depends_on = [aws_lb_listener.http]
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}
```

**Practice Steps**:
1. Deploy ALB + Target Group + ECS Service
2. Chờ target healthy (check Target Group health status)
3. Test: `curl http://<alb-dns-name>/`
4. Scale to 2 tasks: `desired_count = 2`
5. Refresh nhiều lần → thấy load balanced

**Exercise 7: Multi-service routing**
```hcl
# Service 1: Auth
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

# Service 2: API
resource "aws_lb_listener_rule" "api_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_tg.arn
  }
  
  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Default: Frontend
resource "aws_lb_listener_rule" "frontend_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100
  
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
```

### 📖 Tài liệu học

- [ ] [ALB User Guide](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [ ] [Target Groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html)
- [ ] Đọc file dự án: [services.tf](../terraform/services.tf#L70-L145) (ALB config)

### ✅ Checkpoint
- [ ] Hiểu ALB routing trong [services.tf](../terraform/services.tf)
- [ ] Giải thích priority của listener rules
- [ ] Test được application qua ALB DNS
- [ ] Hiểu health check mechanism

---

## 🗓️ TUẦN 8: AWS DATABASES & MESSAGE BROKER

### 📚 Kiến thức cần học

#### 5.1 RDS (Relational Database Service)
- [ ] **Managed PostgreSQL**: AWS tự động backup, patching
- [ ] **Instance Classes**: `db.t3.micro` (free tier)
- [ ] **Multi-AZ**: Automatic failover
- [ ] **Subnet Groups**: DB placement
- [ ] **Connection String**: Format và security

#### 5.2 Amazon MQ (RabbitMQ)
- [ ] **Message Broker**: Async communication
- [ ] **Queues**: Point-to-point messaging
- [ ] **Exchanges**: Routing messages
- [ ] **AMQP Protocol**

#### 5.3 MongoDB Atlas (SaaS)
- [ ] Free tier M0 cluster
- [ ] Connection URI format
- [ ] Network access whitelist

### 🎯 Thực hành

**Exercise 8: RDS PostgreSQL**

```hcl
# DB Subnet Group
resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "learning-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]
}

# RDS Instance
resource "aws_db_instance" "postgres" {
  identifier             = "learning-postgres"
  allocated_storage      = 20
  storage_type           = "gp3"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  db_name                = "myapp_db"
  username               = "admin"
  password               = var.db_password
  
  db_subnet_group_name   = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  
  skip_final_snapshot    = true
  publicly_accessible    = false
}

# Security Group for DB
resource "aws_security_group" "db_sg" {
  name   = "learning-db-sg"
  vpc_id = aws_vpc.learning_vpc.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
  }
}

output "rds_endpoint" {
  value     = aws_db_instance.postgres.endpoint
  sensitive = true
}
```

**Practice Steps**:
1. Deploy RDS instance
2. Connect từ Bastion Host:
```bash
psql -h <rds-endpoint> -U admin -d myapp_db
```
3. Update ECS task environment variable:
```hcl
environment = [
  { 
    name  = "DATABASE_URL"
    value = "postgresql://admin:${var.db_password}@${aws_db_instance.postgres.endpoint}/myapp_db"
  }
]
```
4. Verify app connect to database

**Exercise 9: Setup Bastion Host**

```hcl
# Key Pair
resource "tls_private_key" "bastion_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "bastion_key_pair" {
  key_name   = "learning-bastion-key"
  public_key = tls_private_key.bastion_key.public_key_openssh
}

# Bastion Host
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "bastion" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]
  key_name               = aws_key_pair.bastion_key_pair.key_name
  
  associate_public_ip_address = true
  
  tags = { Name = "Learning Bastion" }
}

resource "aws_security_group" "bastion_sg" {
  name   = "learning-bastion-sg"
  vpc_id = aws_vpc.learning_vpc.id
  
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # In prod, restrict to your IP
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Update DB SG to allow Bastion
resource "aws_security_group_rule" "db_from_bastion" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db_sg.id
  source_security_group_id = aws_security_group.bastion_sg.id
}

output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
}

output "private_key" {
  value     = tls_private_key.bastion_key.private_key_pem
  sensitive = true
}
```

**SSH Tunnel to Database**:
```bash
# Save private key
terraform output -raw private_key > bastion_key.pem
chmod 400 bastion_key.pem

# SSH Tunnel
ssh -i bastion_key.pem -L 5432:<rds-endpoint>:5432 ec2-user@<bastion-ip>

# Connect from local machine
psql -h localhost -U admin -d myapp_db
```

### 📖 Tài liệu học

- [ ] [RDS User Guide](https://docs.aws.amazon.com/rds/)
- [ ] [Amazon MQ for RabbitMQ](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-broker.html)
- [ ] [Bastion Host Best Practices](https://aws.amazon.com/quickstart/architecture/linux-bastion/)
- [ ] Đọc file dự án: [database.tf](../terraform/database.tf), [bastion.tf](../terraform/bastion.tf)

### ✅ Checkpoint
- [ ] Deploy được RDS PostgreSQL
- [ ] Connect to database qua Bastion Host
- [ ] Hiểu tại sao cần Bastion Host
- [ ] ECS service connect được database

---

## 🗓️ TUẦN 9-10: INTEGRATION & PRODUCTION READINESS

### 📚 Kiến thức cần học

#### 6.1 Monitoring & Logging
- [ ] **CloudWatch Logs**: Centralized logging
- [ ] **Log Groups & Streams**
- [ ] **Log Insights**: Query logs
- [ ] **Metrics**: CPU, Memory, Request count

#### 6.2 CI/CD Pipeline
- [ ] **GitHub Actions** / AWS CodePipeline
- [ ] Build → Test → Push to ECR → Deploy to ECS
- [ ] Blue/Green Deployment

#### 6.3 Security Best Practices
- [ ] **Secrets Management**: AWS Secrets Manager / Parameter Store
- [ ] **IAM Least Privilege**
- [ ] **VPC Flow Logs**
- [ ] **Security Group Audit**

#### 6.4 Cost Optimization
- [ ] **Fargate Spot**: Save 70% cost
- [ ] **Auto Scaling**: Scale based on metrics
- [ ] **Reserved Capacity**
- [ ] **Cost Explorer**

### 🎯 Final Project: Deploy Full Stack

**Task**: Deploy full dự án Club Management System

**Checklist**:
- [ ] Fork dự án về máy local
- [ ] Setup AWS credentials: `aws configure`
- [ ] Update `terraform.tfvars` với values của bạn
- [ ] Init Terraform: `terraform init`
- [ ] Plan: `terraform plan` và review
- [ ] Apply từng phần:
  ```bash
  # Step 1: Network
  terraform apply -target=module.vpc
  
  # Step 2: Database
  terraform apply -target=aws_db_instance.auth_db
  terraform apply -target=aws_mq_broker.rabbitmq
  
  # Step 3: ECS Cluster & ALB
  terraform apply -target=aws_ecs_cluster.main
  terraform apply -target=aws_lb.main
  
  # Step 4: Services (sau khi push images to ECR)
  terraform apply
  ```
- [ ] Build và push Docker images:
  ```bash
  # Auth Service
  cd services/auth
  docker build -t club-auth .
  docker tag club-auth:latest <ecr-url>:latest
  docker push <ecr-url>:latest
  
  # Repeat cho các services khác
  ```
- [ ] Verify deployment:
  - Check ECS tasks running
  - Check Target Group health
  - Test ALB DNS name
  - Check CloudWatch logs
- [ ] Setup monitoring alerts
- [ ] Document infrastructure

### 📖 Tài liệu học

- [ ] [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [ ] [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [ ] [ECS Workshop](https://ecsworkshop.com/)

### ✅ Final Checkpoint
- [ ] Deploy được toàn bộ dự án lên AWS
- [ ] Hiểu 100% code trong thư mục `terraform/`
- [ ] Có thể troubleshoot issues
- [ ] Vẽ được full architecture diagram
- [ ] Estimate được cost hàng tháng

---

## 📊 ARCHITECTURE DIAGRAM - DỰ ÁN CỦA BẠN

### Network Layout
```
VPC: 10.0.0.0/16 (ap-southeast-1)
│
├── Public Subnets (10.0.101.0/24, 10.0.102.0/24, 10.0.103.0/24)
│   ├── Application Load Balancer (club-alb)
│   ├── NAT Gateway
│   └── Bastion Host (EC2 t3.micro)
│
└── Private Subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
    ├── ECS Fargate Tasks
    │   ├── Frontend Service (Next.js) - Port 3000
    │   ├── Auth Service (Node.js) - Port 3001
    │   ├── Club Service (Node.js) - Port 3002
    │   ├── Event Service (Node.js) - Port 3003
    │   ├── Image Service (Node.js) - Port 3004
    │   └── Notify Service (Node.js) - Port 3005
    │
    └── Databases
        ├── RDS PostgreSQL (auth_db) - Port 5432
        └── Amazon MQ RabbitMQ - Port 5672/5671
```

### ALB Routing Rules
```
Priority 10:  /api/auth*         → Auth Service (3001)
Priority 20:  /api/clubs*        → Club Service (3002)
Priority 30:  /api/events*       → Event Service (3003)
Priority 40:  /api/images*       → Image Service (3004)
Priority 50:  /api/notifications*→ Notify Service (3005)
Priority 100: /*                 → Frontend Service (3000)
```

### Security Groups
```
alb_sg:
  Inbound:  0.0.0.0/0:80 → ALB
  Outbound: ALL

ecs_tasks_sg:
  Inbound:  alb_sg:3000-4000 → ECS Tasks
  Outbound: ALL

db_sg:
  Inbound:  ecs_tasks_sg:5432 → RDS
  Inbound:  ecs_tasks_sg:5672 → RabbitMQ
  Inbound:  bastion_sg:5432   → RDS (for admin access)
  Outbound: ALL

bastion_sg:
  Inbound:  0.0.0.0/0:22 → Bastion
  Outbound: ALL
```

---

## 🛠️ TROUBLESHOOTING GUIDE

### Issue 1: ECS Task không start
**Symptoms**: Task failed to start, stuck in pending

**Debug**:
```bash
# Check task definition
aws ecs describe-task-definition --task-definition club-auth-task

# Check service events
aws ecs describe-services --cluster club-management-cluster --services club-auth-service

# Check CloudWatch logs
aws logs tail /ecs/club-management --follow
```

**Common Causes**:
- [ ] Image không tồn tại trong ECR
- [ ] Task execution role không có quyền pull image
- [ ] Subnet không có NAT Gateway (không pull image được)
- [ ] Security group block traffic

### Issue 2: Target Unhealthy
**Symptoms**: Target group shows unhealthy

**Debug**:
```bash
# Check health check settings
aws elbv2 describe-target-health --target-group-arn <tg-arn>

# Check logs
aws logs tail /ecs/club-management --filter-pattern "ERROR" --follow
```

**Common Causes**:
- [ ] Health check path sai (e.g., `/health` không exist)
- [ ] Container không listen đúng port
- [ ] Security group không allow ALB → ECS
- [ ] Application crash khi start

### Issue 3: RDS Connection Timeout
**Symptoms**: App không connect được database

**Debug**:
```bash
# Test từ ECS task
aws ecs execute-command \
  --cluster club-management-cluster \
  --task <task-id> \
  --command "nc -zv <rds-endpoint> 5432" \
  --interactive
```

**Common Causes**:
- [ ] Security group không allow ECS → RDS
- [ ] RDS endpoint sai
- [ ] Database credentials sai
- [ ] VPC DNS resolution disabled

### Issue 4: Terraform Apply Failed
**Symptoms**: `terraform apply` fails with errors

**Debug**:
```bash
# Check state
terraform state list

# Show resource
terraform state show <resource-name>

# Validate
terraform validate

# Check logs
TF_LOG=DEBUG terraform apply
```

**Common Fixes**:
- [ ] Destroy conflicting resources
- [ ] Import existing resources: `terraform import`
- [ ] Update state: `terraform state rm` → `terraform import`

---

## 📝 QUIZ - KIỂM TRA KIẾN THỨC

### Câu 1: Networking
Subnet `10.0.1.0/24` có bao nhiêu địa chỉ IP?
- A. 256
- B. 254 (usable)
- C. 512
- D. 128

<details>
<summary>Đáp án</summary>
B. 254 usable IPs (256 total - 2 reserved by AWS)
</details>

### Câu 2: Security Groups
Tại sao database security group chỉ cho phép traffic từ ECS tasks security group?
<details>
<summary>Đáp án</summary>
Least privilege principle. Database chỉ nên được access từ application tier, không expose ra internet hay các services không liên quan.
</details>

### Câu 3: ECS
Trong task definition, `cpu = 256` nghĩa là gì?
<details>
<summary>Đáp án</summary>
256 CPU units = 0.25 vCPU (1 vCPU = 1024 units)
</details>

### Câu 4: ALB
Listener rule với priority 10 vs priority 100, rule nào được check trước?
<details>
<summary>Đáp án</summary>
Priority 10 (lower number = higher priority)
</details>

### Câu 5: Terraform
Khi nào cần chạy `terraform init`?
<details>
<summary>Đáp án</summary>
- Lần đầu setup project
- Khi add new provider
- Khi add/update modules
- Sau khi clone project từ Git
</details>

---

## 🎯 COMPLETION CHECKLIST

### Terraform Mastery
- [ ] Hiểu HCL syntax
- [ ] Biết cách sử dụng variables, outputs
- [ ] Hiểu state management
- [ ] Biết cách import existing resources
- [ ] Có thể debug Terraform errors

### AWS Networking
- [ ] Vẽ được VPC diagram
- [ ] Hiểu public vs private subnets
- [ ] Hiểu security groups và NACLs
- [ ] Biết cách troubleshoot connectivity issues
- [ ] Hiểu NAT Gateway và Internet Gateway

### AWS Compute
- [ ] Build và deploy Docker containers
- [ ] Hiểu ECS task definitions
- [ ] Biết cách scale ECS services
- [ ] Troubleshoot ECS task failures
- [ ] Monitor containers với CloudWatch

### AWS Load Balancing
- [ ] Configure ALB với listener rules
- [ ] Setup health checks
- [ ] Hiểu target group routing
- [ ] Debug unhealthy targets

### AWS Databases
- [ ] Deploy RDS PostgreSQL
- [ ] Setup database security
- [ ] Connect to database qua Bastion Host
- [ ] Backup và restore strategies

### Production Ready
- [ ] Deploy full application stack
- [ ] Setup monitoring và alerting
- [ ] Implement security best practices
- [ ] Estimate và optimize costs
- [ ] Document infrastructure

---

## 🚀 NEXT STEPS

Sau khi hoàn thành roadmap này:

1. **Advanced Topics**:
   - [ ] Kubernetes (EKS)
   - [ ] Service Mesh (App Mesh)
   - [ ] GitOps (ArgoCD)
   - [ ] Infrastructure Testing (Terratest)

2. **Certifications**:
   - [ ] AWS Certified Solutions Architect - Associate
   - [ ] HashiCorp Certified: Terraform Associate

3. **Real Projects**:
   - [ ] Deploy side project của bạn
   - [ ] Contribute to open source infrastructure
   - [ ] Write blog posts về những gì học được

---

## 📚 RESOURCES TỔNG HỢP

### Documentation
- [Terraform Docs](https://www.terraform.io/docs)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Docker Docs](https://docs.docker.com/)

### Video Courses
- [AWS for Beginners - freeCodeCamp](https://www.youtube.com/watch?v=ulprqHHWlng)
- [Terraform Course - freeCodeCamp](https://www.youtube.com/watch?v=SLB_c_ayRMo)
- [ECS Workshop](https://ecsworkshop.com/)

### Books
- "Terraform: Up & Running" by Yevgeniy Brikman
- "AWS Certified Solutions Architect Official Study Guide"

### Communities
- [r/terraform](https://reddit.com/r/terraform)
- [r/aws](https://reddit.com/r/aws)
- [HashiCorp Discuss](https://discuss.hashicorp.com/)

---

## ✅ TRACKING PROGRESS

**Tuần 1**: ⬜ Terraform Basics  
**Tuần 2**: ⬜ Terraform Practice  
**Tuần 3**: ⬜ VPC & Networking  
**Tuần 4**: ⬜ Security Groups  
**Tuần 5**: ⬜ Docker & ECR  
**Tuần 6**: ⬜ ECS & Fargate  
**Tuần 7**: ⬜ ALB & Routing  
**Tuần 8**: ⬜ Databases  
**Tuần 9**: ⬜ Monitoring  
**Tuần 10**: ⬜ Full Deployment  

**Started**: __________  
**Completed**: __________

---

**Good luck! 🎉**

*"Infrastructure as Code is not just about automation, it's about treating infrastructure with the same rigor as application code."*
