#!/bin/bash

# Package Lambda function for deployment
# Run this before terraform apply

set -e

echo "📦 Packaging Lambda function..."

cd "$(dirname "$0")"

# Check if Python file exists
if [ ! -f "scheduler-lambda.py" ]; then
    echo "❌ scheduler-lambda.py not found!"
    exit 1
fi

# Create zip file
zip -q scheduler-lambda.zip scheduler-lambda.py

echo "✅ Lambda function packaged: scheduler-lambda.zip"
echo "📊 Package size: $(du -h scheduler-lambda.zip | cut -f1)"

# Test Lambda locally (optional)
if command -v python3 &> /dev/null; then
    echo ""
    echo "🧪 Testing Lambda function locally..."
    
    # Set test environment variables
    export ECS_CLUSTER_NAME="staging-club-cluster"
    export RDS_INSTANCE_ID="staging-club-auth-db"
    export ECS_SERVICES="staging-club-auth,staging-club-rabbitmq"
    
    # Dry run test (comment out actual AWS calls in the script)
    echo "Test environment configured:"
    echo "  ECS_CLUSTER_NAME: $ECS_CLUSTER_NAME"
    echo "  RDS_INSTANCE_ID: $RDS_INSTANCE_ID"
    echo "  ECS_SERVICES: $ECS_SERVICES"
    echo ""
    echo "To test manually:"
    echo "  python3 scheduler-lambda.py"
else
    echo "⚠️  Python3 not found, skipping local test"
fi

echo ""
echo "✅ Ready for deployment!"
echo ""
echo "Next steps:"
echo "  1. terraform init"
echo "  2. terraform plan"
echo "  3. terraform apply"
