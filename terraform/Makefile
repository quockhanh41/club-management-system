# Common Makefile for Terraform operations

.PHONY: help init plan apply destroy fmt validate clean

# Default environment
ENV ?= production
ENV_DIR = environments/$(ENV)

help: ## Show this help message
	@echo 'Usage: make [target] ENV=<environment>'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

init: ## Initialize Terraform
	@echo "Initializing Terraform for $(ENV)..."
	@cd $(ENV_DIR) && terraform init

plan: ## Run Terraform plan
	@echo "Planning changes for $(ENV)..."
	@cd $(ENV_DIR) && terraform plan

apply: ## Apply Terraform changes
	@echo "Applying changes for $(ENV)..."
	@cd $(ENV_DIR) && terraform apply

apply-auto: ## Apply changes without confirmation
	@echo "Auto-applying changes for $(ENV)..."
	@cd $(ENV_DIR) && terraform apply -auto-approve

destroy: ## Destroy infrastructure
	@echo "Destroying infrastructure for $(ENV)..."
	@cd $(ENV_DIR) && terraform destroy

destroy-auto: ## Destroy infrastructure without confirmation
	@echo "Auto-destroying infrastructure for $(ENV)..."
	@cd $(ENV_DIR) && terraform destroy -auto-approve

fmt: ## Format Terraform files
	@echo "Formatting Terraform files..."
	@terraform fmt -recursive .

validate: ## Validate Terraform configuration
	@echo "Validating configuration for $(ENV)..."
	@cd $(ENV_DIR) && terraform validate

output: ## Show Terraform outputs
	@cd $(ENV_DIR) && terraform output

output-json: ## Show outputs in JSON format
	@cd $(ENV_DIR) && terraform output -json

state-list: ## List resources in state
	@cd $(ENV_DIR) && terraform state list

clean: ## Clean Terraform files
	@echo "Cleaning Terraform files..."
	@find . -type d -name ".terraform" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "terraform.tfstate*" -delete 2>/dev/null || true
	@find . -type f -name ".terraform.lock.hcl" -delete 2>/dev/null || true

# Infrastructure targets
infra-only: ## Apply infrastructure only (VPC, ALB, Databases)
	@echo "Applying infrastructure for $(ENV)..."
	@cd $(ENV_DIR) && terraform apply \
		-target=module.vpc \
		-target=module.alb \
		-target=module.databases

services-only: ## Apply services only
	@echo "Applying services for $(ENV)..."
	@cd $(ENV_DIR) && terraform apply \
		-target=module.auth_service \
		-target=module.club_service \
		-target=module.event_service \
		-target=module.image_service \
		-target=module.notify_service \
		-target=module.frontend

# ECR targets
ecr-login: ## Login to ECR
	@echo "Logging into ECR..."
	@aws ecr get-login-password --region ap-southeast-1 | \
		docker login --username AWS --password-stdin $$(aws sts get-caller-identity --query Account --output text).dkr.ecr.ap-southeast-1.amazonaws.com

ecr-urls: ## Show ECR repository URLs
	@cd $(ENV_DIR) && terraform output -json ecr_repositories | jq -r 'to_entries[] | "\(.key): \(.value)"'

# Service-specific targets
deploy-auth: ## Deploy auth service only
	@cd $(ENV_DIR) && terraform apply -target=module.auth_service

deploy-club: ## Deploy club service only
	@cd $(ENV_DIR) && terraform apply -target=module.club_service

deploy-event: ## Deploy event service only
	@cd $(ENV_DIR) && terraform apply -target=module.event_service

deploy-image: ## Deploy image service only
	@cd $(ENV_DIR) && terraform apply -target=module.image_service

deploy-notify: ## Deploy notify service only
	@cd $(ENV_DIR) && terraform apply -target=module.notify_service

deploy-frontend: ## Deploy frontend only
	@cd $(ENV_DIR) && terraform apply -target=module.frontend

# Utility targets
show-alb: ## Show ALB DNS name
	@cd $(ENV_DIR) && terraform output alb_url

show-bastion: ## Show bastion connection info
	@cd $(ENV_DIR) && terraform output bastion_ssh_command

get-bastion-key: ## Save bastion private key to file
	@cd $(ENV_DIR) && terraform output -raw bastion_private_key > bastion-key.pem
	@chmod 400 bastion-key.pem
	@echo "Bastion key saved to bastion-key.pem"

docs: ## Generate module documentation
	@echo "Generating documentation..."
	@terraform-docs markdown table --output-file README.md --output-mode inject modules/foundational/ecs-service
	@terraform-docs markdown table --output-file README.md --output-mode inject modules/foundational/security-group
	@terraform-docs markdown table --output-file README.md --output-mode inject modules/composition/microservice-stack

# Development targets
dev-plan: ENV=dev
dev-plan: plan  ## Plan for dev environment

dev-apply: ENV=dev
dev-apply: apply  ## Apply for dev environment

prod-plan: ENV=production
prod-plan: plan  ## Plan for production environment

prod-apply: ENV=production
prod-apply: apply  ## Apply for production environment

# Safety checks
check-env:
	@if [ "$(ENV)" = "production" ]; then \
		echo "⚠️  WARNING: You are about to modify PRODUCTION environment!"; \
		echo "Press Ctrl+C to cancel, or Enter to continue..."; \
		read confirm; \
	fi
