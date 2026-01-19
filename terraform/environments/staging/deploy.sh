#!/bin/bash

# Quick Deploy Script for Staging Environment
# Automates the deployment process

set -e

echo "🚀 Club Management System - Staging Deployment"
echo "=============================================="
echo ""

# Check if in correct directory
if [ ! -f "package-lambda.sh" ]; then
    echo "❌ Error: Must run from terraform/environments/staging directory"
    exit 1
fi

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Please install Terraform >= 1.6.0"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker"
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Check terraform.tfvars.local exists
if [ ! -f "terraform.tfvars.local" ]; then
    echo "❌ terraform.tfvars.local not found"
    echo "💡 Please create it with your secrets:"
    echo ""
    cat << 'EOF'
db_password           = "your-secure-password"
mq_password           = "your-rabbitmq-password"
mongodb_uri           = "mongodb+srv://user:pass@cluster.mongodb.net/db"
jwt_refresh_secret    = "your-jwt-refresh-secret"
api_gateway_secret    = "your-api-gateway-secret"
EOF
    exit 1
fi

echo "✅ Configuration found"
echo ""

# Step 1: Package Lambda
echo "📦 Step 1/4: Packaging Lambda function..."
./package-lambda.sh
echo ""

# Step 2: Initialize Terraform
echo "🔧 Step 2/4: Initializing Terraform..."
terraform init
echo ""

# Step 3: Plan
echo "📋 Step 3/4: Planning infrastructure..."
terraform plan -out=tfplan
echo ""

# Confirm
read -p "🚀 Ready to deploy? This will create AWS resources. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    rm -f tfplan
    exit 0
fi

# Step 4: Apply
echo "🚀 Step 4/4: Deploying infrastructure..."
terraform apply tfplan
rm -f tfplan
echo ""

# Save outputs
echo "💾 Saving outputs..."
terraform output > staging-deployment.txt
terraform output -json > staging-deployment.json

echo ""
echo "✅ Infrastructure deployed successfully!"
echo ""
echo "📊 Important outputs:"
echo "===================="
terraform output alb_dns_name
terraform output rds_endpoint
terraform output ecs_cluster_name
echo ""

echo "🌱 Next steps:"
echo "1. Build and push seed scripts image:"
echo "   cd ../../../database_script"
echo "   terraform -chdir=../terraform/environments/staging output seed_task_build_commands | bash"
echo ""
echo "2. Setup GitHub Actions secrets (if not already done):"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - DOCKER_USERNAME"
echo "   - DOCKER_PASSWORD"
echo ""
echo "3. Push to develop branch to trigger Post-Merge Pipeline:"
echo "   git push origin develop"
echo ""
echo "4. View CloudWatch Dashboard:"
echo "   terraform output dashboard_url"
echo ""
echo "📚 Documentation:"
echo "   - Deployment Guide: DEPLOYMENT-GUIDE.md"
echo "   - Seeding Guide: DATABASE-SEEDING-GUIDE.md"
echo ""
echo "🎉 Staging environment ready!"
