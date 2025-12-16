# ==============================================================================
# 1. AWS RDS (PostgreSQL) - For Auth Service
# ==============================================================================

resource "aws_db_subnet_group" "rds_subnet_group_v2" {
  name       = "club-rds-subnet-group-v2" # Changed name to avoid 'AlreadyExists' error
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "Club RDS Subnet Group"
  }
}

resource "aws_db_instance" "auth_db" {
  identifier        = "club-auth-db"
  allocated_storage = 20
  storage_type      = "gp3"
  engine            = "postgres"
  engine_version    = "15" # Check latest available in region
  instance_class    = "db.t3.micro" # Free tier eligible
  db_name           = "auth_db"
  username          = "auth_admin"
  password          = var.db_password
  
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group_v2.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  
  skip_final_snapshot    = true # Set false for production
  publicly_accessible    = false
  multi_az               = false # Set true for production
}

# ==============================================================================
# 2. AWS DocumentDB (MongoDB Compatible)
# NOTE: COMMENTED OUT because AWS Free Tier does NOT support DocumentDB.
# Use MongoDB Atlas (SaaS) instead for free tier.
# ==============================================================================

# resource "aws_docdb_subnet_group" "docdb_subnet_group" {
#   name       = "club-docdb-subnet-group"
#   subnet_ids = module.vpc.private_subnets
#   tags = { Name = "Club DocDB Subnet Group" }
# }

# resource "aws_docdb_cluster" "club_docdb" {
#   cluster_identifier      = "club-docdb-cluster"
#   engine                  = "docdb"
#   master_username         = "docdb_admin"
#   master_password         = var.db_password
#   backup_retention_period = 1 
#   preferred_backup_window = "07:00-09:00"
#   skip_final_snapshot     = true
#   db_subnet_group_name    = aws_docdb_subnet_group.docdb_subnet_group.name  # UNCOMMENT if using
#   # db_subnet_group_name    = "club-docdb-subnet-group" # Placeholder if commented out
#   vpc_security_group_ids  = [aws_security_group.db_sg.id]
# }

# resource "aws_docdb_cluster_instance" "cluster_instances" {
#   count              = 1
#   identifier         = "club-docdb-instance-${count.index}"
#   cluster_identifier = "club-docdb-cluster" # aws_docdb_cluster.club_docdb.id
#   instance_class     = "db.t3.medium"
# }

# ==============================================================================
# 3. Amazon MQ (RabbitMQ) - For Message Broker
# ==============================================================================

resource "aws_mq_broker" "rabbitmq" {
  broker_name = "club-rabbitmq"

  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type = "mq.t3.micro" 
  deployment_mode    = "SINGLE_INSTANCE"
  
  auto_minor_version_upgrade = true
  
  user {
    username = "rabbit_admin" # 'guest' is prohibited
    password = var.mq_password
  }
  
  subnet_ids = [module.vpc.private_subnets[0]]
  security_groups = [aws_security_group.db_sg.id]
  
  publicly_accessible = false
}

# ==============================================================================
# Outputs
# ==============================================================================

output "rds_endpoint" {
  value = aws_db_instance.auth_db.endpoint
}

# output "docdb_endpoint" {
#   value = aws_docdb_cluster.club_docdb.endpoint
# }

output "rabbitmq_endpoints" {
  value = aws_mq_broker.rabbitmq.instances[0].endpoints
}
