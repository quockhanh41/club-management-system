module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "club-management-vpc"
  cidr = var.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true # Matches Step 1.1 Manual Guide (Cost saving)
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Subnet tags for ensuring services find the right subnets
  public_subnet_tags = {
    "Type" = "Public"
  }
  
  private_subnet_tags = {
    "Type" = "Private"
  }
}

# Security Group for Database Access (Internal)
resource "aws_security_group" "db_sg" {
  name        = "club-db-sg"
  description = "Access for DB"
  vpc_id      = module.vpc.vpc_id

  # Inbound from ECS Tasks
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
    description     = "PostgreSQL from ECS"
  }
  
  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
    description     = "MongoDB from ECS"
  }

  ingress {
    from_port       = 5672
    to_port         = 5672
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
    description     = "RabbitMQ from ECS"
  }

  ingress {
    from_port       = 5671
    to_port         = 5671
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
    description     = "RabbitMQ SSL from ECS"
  }

  # Inbound from Bastion (SSH Tunnel) - Step 6 Manual Guide
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
