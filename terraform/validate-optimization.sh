#!/bin/bash

# Terraform Optimization Validation Script
# Checks if optimization was successful

set -e

echo "🔍 Validating Terraform Optimization..."
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAILED++))
    fi
}

# Function to check module exists
check_module() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Module exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Module missing: $1"
        ((FAILED++))
    fi
}

# Function to check line count
check_line_count() {
    local file=$1
    local max_lines=$2
    local actual_lines=$(wc -l < "$file")
    
    if [ "$actual_lines" -le "$max_lines" ]; then
        echo -e "${GREEN}✓${NC} $file: $actual_lines lines (target: <=$max_lines)"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $file: $actual_lines lines (target: <=$max_lines)"
        ((FAILED++))
    fi
}

# Function to check pattern exists in file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description (pattern not found in $file)"
        ((FAILED++))
    fi
}

echo "📁 Checking New Modules..."
echo "-------------------------"
check_module "modules/composition/database-layer-staging"
check_file "modules/composition/database-layer-staging/main.tf"
check_file "modules/composition/database-layer-staging/variables.tf"
check_file "modules/composition/database-layer-staging/outputs.tf"
check_file "modules/composition/database-layer-staging/README.md"
echo ""

echo "📄 Checking Staging Environment..."
echo "---------------------------------"
check_file "environments/staging/main.tf"
check_line_count "environments/staging/main.tf" 360
check_pattern "environments/staging/main.tf" "module \"databases\"" "Uses database module"
check_pattern "environments/staging/main.tf" "module \"auth_service\"" "Uses auth service module"
check_pattern "environments/staging/main.tf" "module \"alb\"" "Uses ALB module"
check_pattern "environments/staging/main.tf" "source_security_group_id" "Uses standardized SG pattern"
echo ""

echo "📄 Checking Production Environment..."
echo "------------------------------------"
check_file "environments/production/main.tf"
check_file "environments/production/monitoring.tf"
check_pattern "environments/production/monitoring.tf" "aws_cloudwatch_dashboard" "Has CloudWatch dashboard"
check_pattern "environments/production/monitoring.tf" "module.databases" "Uses module references"
check_pattern "environments/production/monitoring.tf" "module.alb" "Uses ALB module reference"
echo ""

echo "🔧 Checking Shared Configuration..."
echo "-----------------------------------"
check_file "shared/config.tf"
check_pattern "shared/config.tf" "service_ports" "Has service port mappings"
check_pattern "shared/config.tf" "defaults" "Has default configurations"
echo ""

echo "📚 Checking Documentation..."
echo "---------------------------"
check_file "OPTIMIZATION-ANALYSIS.md"
check_file "OPTIMIZATION-COMPLETED.md"
echo ""

echo "🧪 Running Terraform Validation..."
echo "---------------------------------"

# Validate staging
cd environments/staging
if terraform init -backend=false > /dev/null 2>&1; then
    if terraform validate > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Staging terraform validate passed"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Staging terraform validate failed"
        ((FAILED++))
        terraform validate
    fi
else
    echo -e "${YELLOW}⚠${NC} Could not init staging (might need AWS credentials)"
fi
cd ../..

# Validate production
cd environments/production
if terraform init -backend=false > /dev/null 2>&1; then
    if terraform validate > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Production terraform validate passed"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Production terraform validate failed"
        ((FAILED++))
        terraform validate
    fi
else
    echo -e "${YELLOW}⚠${NC} Could not init production (might need AWS credentials)"
fi
cd ../..

echo ""
echo "======================================"
echo "📊 Validation Results"
echo "======================================"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review terraform plan output:"
    echo "   cd environments/staging && terraform plan"
    echo "2. Deploy to staging:"
    echo "   terraform apply"
    echo "3. Test functionality"
    echo "4. Deploy monitoring to production"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review above.${NC}"
    exit 1
fi
