# Database Layer - Staging Module

Cost-optimized database layer for staging environments with self-hosted RabbitMQ.

## Features

- **RDS PostgreSQL** - Single-AZ, cost-optimized configuration
- **Self-hosted RabbitMQ** - Running in ECS Fargate (saves ~$238/month vs Amazon MQ)
- **Service Discovery** - Optional Cloud Map integration
- **Auto-scaling Storage** - RDS storage can auto-scale up to 100GB
- **Scheduler-ready** - Tagged for auto stop/start

## Cost Comparison

| Component | Amazon Managed | Self-hosted (This Module) | Savings |
|-----------|----------------|---------------------------|---------|
| RabbitMQ | Amazon MQ: $238/mo | ECS Fargate: ~$13/mo | **$225/mo** |
| RDS | Multi-AZ: $24/mo | Single-AZ: $12/mo | **$12/mo** |
| **Total** | **$262/mo** | **$25/mo** | **$237/mo (90%)** |

## Usage

```hcl
module "databases" {
  source = "../../modules/composition/database-layer-staging"
  
  name_prefix        = "staging"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnets
  aws_region         = "ap-southeast-1"
  
  allowed_security_group_ids = [module.ecs_tasks_sg.security_group_id]
  
  # RDS Configuration
  rds_instance_class    = "db.t3.micro"
  rds_allocated_storage = 20
  rds_master_password   = var.db_password
  
  # RabbitMQ Configuration
  ecs_cluster_id          = aws_ecs_cluster.main.id
  ecs_execution_role_arn  = aws_iam_role.ecs_execution.arn
  rabbitmq_admin_password = var.mq_password
  
  # Service Discovery (optional)
  service_discovery_namespace_id = aws_service_discovery_private_dns_namespace.main.id
  
  tags = local.common_tags
}
```

## Outputs

Access database endpoints:

```hcl
# PostgreSQL connection
postgresql://${module.databases.rds_address}:${module.databases.rds_port}/${module.databases.rds_database_name}

# RabbitMQ connection (via service discovery)
${module.databases.rabbitmq_endpoint}
```

## Differences from Production Module

| Feature | Production (`database-layer`) | Staging (This Module) |
|---------|------------------------------|----------------------|
| RDS Multi-AZ | ✅ Yes | ❌ No (single-AZ) |
| RabbitMQ | Amazon MQ | Self-hosted ECS |
| Backup Retention | 7 days | 1 day |
| Final Snapshot | ✅ Yes | ❌ No |
| Deletion Protection | ✅ Yes | ❌ No |
| Scheduler Tags | ❌ No | ✅ Yes |

## Scheduler Integration

This module tags resources with `Schedule = "business-hours"` for use with the scheduler Lambda:

- RDS stops at 7 PM, starts at 7 AM (Mon-Fri)
- RabbitMQ ECS tasks scale to 0 at 7 PM, back to 1 at 7 AM
- Saves ~60% on runtime costs

## Security

- All resources in private subnets
- Security groups restrict access to ECS tasks only
- Optional bastion host access for troubleshooting
- Secrets managed via Terraform variables (use SSM in production)
