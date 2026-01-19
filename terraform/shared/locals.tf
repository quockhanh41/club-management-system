locals {
  # Common tags for all resources
  common_tags = {
    Project     = "ClubManagementSystem"
    ManagedBy   = "Terraform"
    Repository  = "club-management-system"
    Team        = "Platform"
  }
  
  # Environment-specific naming
  name_prefix = {
    dev        = "dev"
    staging    = "stg"
    production = "prod"
  }
  
  # AWS Regions
  regions = {
    primary   = "ap-southeast-1"  # Singapore
    secondary = "ap-southeast-2"  # Sydney
  }
  
  # CIDR blocks for environments
  vpc_cidrs = {
    dev        = "10.0.0.0/16"
    staging    = "10.1.0.0/16"
    production = "10.2.0.0/16"
  }
  
  # Service ports
  service_ports = {
    auth     = 3001
    club     = 3002
    event    = 3003
    image    = 3004
    notify   = 3005
    frontend = 3000
  }
  
  # Default resource sizing
  default_instance_types = {
    dev = {
      ecs_cpu    = 256
      ecs_memory = 512
      rds_class  = "db.t3.micro"
      mq_type    = "mq.t3.micro"
    }
    staging = {
      ecs_cpu    = 256
      ecs_memory = 512
      rds_class  = "db.t3.small"
      mq_type    = "mq.t3.micro"
    }
    production = {
      ecs_cpu    = 512
      ecs_memory = 1024
      rds_class  = "db.t3.medium"
      mq_type    = "mq.t3.small"
    }
  }
}
