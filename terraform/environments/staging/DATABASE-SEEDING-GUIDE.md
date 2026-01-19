# Automated Database Seeding Guide

## Overview

Database seeding is now **fully automated** during deployment! 🎉

When you deploy to staging via the Post-Merge Pipeline, the system automatically:
1. Builds a Docker image from `database_script/` with all seed scripts
2. Pushes the image to ECR
3. Runs an ECS Fargate task to seed PostgreSQL and MongoDB
4. Waits for completion and shows logs

**No more manual SSH tunneling or running Python scripts!**

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions (Post-Merge Pipeline)                       │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐ │
│  │ Build Seed  │ -> │ Push to ECR  │ -> │  Run ECS Task │ │
│  │   Docker    │    │              │    │   (Fargate)   │ │
│  └─────────────┘    └──────────────┘    └───────┬───────┘ │
└──────────────────────────────────────────────────┼─────────┘
                                                    │
                                                    ▼
                        ┌───────────────────────────────────────┐
                        │    AWS ECS Fargate Task               │
                        │  ┌─────────────────────────────────┐  │
                        │  │  Seed Scripts Container         │  │
                        │  │  - Python 3.11                  │  │
                        │  │  - All seed scripts             │  │
                        │  │  - Database connections         │  │
                        │  └────────┬─────────────┬──────────┘  │
                        └───────────┼─────────────┼─────────────┘
                                    │             │
                        ┌───────────▼─────┐   ┌──▼──────────────┐
                        │  RDS PostgreSQL │   │  MongoDB Atlas  │
                        │  (Auth Service) │   │  (Club, Event)  │
                        └─────────────────┘   └─────────────────┘
```

### Components

1. **Dockerfile** ([database_script/Dockerfile](database_script/Dockerfile))
   - Packages all Python seed scripts
   - Installs dependencies: psycopg2, pymongo, faker
   - Auto-confirms seeding prompt with `echo "y"`

2. **Terraform Config** ([terraform/environments/staging/seed-task.tf](terraform/environments/staging/seed-task.tf))
   - Creates ECR repository for seed scripts
   - Defines ECS task (0.5 vCPU, 1GB RAM)
   - Sets environment variables (DB hosts, ports, URIs)
   - Stores secrets in SSM Parameter Store
   - Configures IAM roles and permissions

3. **GitHub Actions** ([.github/workflows/post-merge.yml](.github/workflows/post-merge.yml))
   - Builds seed Docker image
   - Pushes to ECR
   - Runs ECS task
   - Waits for completion
   - Shows logs

---

## Deployment Flow

### Automatic (Post-Merge Pipeline)

When you merge to `develop`:

```bash
git push origin develop
```

The pipeline automatically:

1. ✅ **Build Stage** (5 min)
   - Builds seed scripts Docker image
   - Tags with version (e.g., `v1.0.0-abc123`)

2. ✅ **Push Stage** (2 min)
   - Pushes to ECR repository
   - Creates `:latest` and versioned tags

3. ✅ **Seed Stage** (3-5 min)
   - Runs ECS Fargate task
   - Seeds PostgreSQL (Auth users, roles)
   - Seeds MongoDB (Clubs, Events, Memberships)
   - Shows real-time logs

4. ✅ **Validation** (1 min)
   - Checks exit code
   - Displays summary

**Total time:** ~10-15 minutes for full deployment + seeding

### Manual Seeding

If you need to re-seed without full deployment:

```bash
cd terraform/environments/staging

# Get the commands from Terraform output
terraform output seed_task_commands

# Or run directly:
aws ecs run-task \
  --cluster staging-club-cluster \
  --task-definition staging-club-management-seed-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}"

# View logs
aws logs tail /ecs/staging-club-management-seed --follow
```

---

## Configuration

### Environment Variables

Configured in [seed-task.tf](terraform/environments/staging/seed-task.tf):

| Variable | Source | Description |
|----------|--------|-------------|
| `DB_HOST` | RDS Endpoint | PostgreSQL host |
| `DB_PORT` | RDS Port | PostgreSQL port (5432) |
| `DB_USER` | RDS Username | Database user |
| `DB_PASSWORD` | SSM Parameter | **Secure** password |
| `DB_NAME` | RDS DB Name | Database name |
| `MONGODB_URI` | Terraform Variable | MongoDB Atlas connection string |
| `CLOUDINARY_API_SECRET` | SSM Parameter | **Secure** Cloudinary secret |

### Secrets in SSM Parameter Store

Sensitive values stored securely:

```bash
# View parameters
aws ssm get-parameter --name /staging/club-management/db_password --with-decryption
aws ssm get-parameter --name /staging/club-management/cloudinary_secret --with-decryption

# Update password (if needed)
aws ssm put-parameter \
  --name /staging/club-management/db_password \
  --value "NewSecurePassword123!" \
  --type SecureString \
  --overwrite
```

---

## Monitoring & Logs

### View Seed Logs

```bash
# Real-time logs
aws logs tail /ecs/staging-club-management-seed --follow

# Last 10 minutes
aws logs tail /ecs/staging-club-management-seed --since 10m

# Filter for errors
aws logs tail /ecs/staging-club-management-seed --since 1h --filter-pattern "ERROR"
```

### CloudWatch Logs Insights

Go to CloudWatch Console and use this query:

```sql
fields @timestamp, @message
| filter @logStream like /seed/
| sort @timestamp desc
| limit 100
```

### Check Seed Task Status

```bash
# List recent seed tasks
aws ecs list-tasks \
  --cluster staging-club-cluster \
  --family staging-club-management-seed-task

# Describe specific task
aws ecs describe-tasks \
  --cluster staging-club-cluster \
  --tasks <task-arn>

# Check exit code
aws ecs describe-tasks \
  --cluster staging-club-cluster \
  --tasks <task-arn> \
  --query 'tasks[0].containers[0].exitCode'
```

---

## Troubleshooting

### Issue: Seed Task Fails

**Symptoms:**
- Exit code: 1
- Error logs in CloudWatch

**Solutions:**

1. **Check database connectivity:**
   ```bash
   # Test RDS connection
   aws rds describe-db-instances --db-instance-identifier staging-club-auth-db
   
   # Check security group rules
   aws ec2 describe-security-groups --filters "Name=tag:Name,Values=staging-ecs-tasks-sg"
   ```

2. **Verify MongoDB URI:**
   ```bash
   # Get MongoDB URI from terraform
   cd terraform/environments/staging
   terraform output -raw mongodb_uri  # Should show MongoDB Atlas connection string
   ```

3. **Check SSM parameters:**
   ```bash
   # Verify password is set
   aws ssm get-parameter --name /staging/club-management/db_password --with-decryption
   ```

4. **Run seed task with updated image:**
   ```bash
   # Rebuild and push
   cd database_script
   docker build --platform linux/amd64 -t seed-scripts:debug .
   
   # Tag and push
   SEED_ECR=$(terraform -chdir=../terraform/environments/staging output -raw seed_ecr_repository_url)
   docker tag seed-scripts:debug ${SEED_ECR}:debug
   docker push ${SEED_ECR}:debug
   
   # Update task definition to use :debug tag
   # Then run task manually
   ```

### Issue: Task Takes Too Long

**Symptoms:**
- Task runs for > 10 minutes
- Timeout in GitHub Actions

**Solutions:**

1. **Reduce batch size:**
   ```bash
   # Edit seed-task.tf, add environment variable:
   {
     name  = "SEED_BATCH_SIZE"
     value = "50"  # Reduce from 100
   }
   
   terraform apply
   ```

2. **Increase task timeout:**
   ```bash
   # In .github/workflows/post-merge.yml, increase wait time:
   aws ecs wait tasks-stopped \
     --cluster staging-club-cluster \
     --tasks ${TASK_ARN} \
     --cli-read-timeout 900  # 15 minutes
   ```

3. **Check RDS performance:**
   ```bash
   # View RDS metrics in CloudWatch
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name CPUUtilization \
     --dimensions Name=DBInstanceIdentifier,Value=staging-club-auth-db \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Average
   ```

### Issue: Duplicate Data

**Symptoms:**
- Seed task runs multiple times
- Duplicate users, clubs, events

**Solutions:**

1. **Clear database before seeding:**
   ```bash
   # Connect to RDS (via Bastion if needed)
   psql -h <rds-endpoint> -U postgres -d club_auth_db
   
   # Drop and recreate schema
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   
   # For MongoDB, drop collections manually or add to seed script
   ```

2. **Add idempotency to seed scripts:**
   Edit `database_script/seed_auth_service_enhanced_v2.py`:
   ```python
   # Check if data exists before seeding
   cursor.execute("SELECT COUNT(*) FROM users")
   if cursor.fetchone()[0] > 0:
       print("⚠️  Database already seeded, skipping...")
       return
   ```

3. **Manual cleanup:**
   ```bash
   # Delete all tasks
   aws ecs list-tasks --cluster staging-club-cluster --family staging-club-management-seed-task
   
   # Stop running tasks
   aws ecs stop-task --cluster staging-club-cluster --task <task-arn>
   ```

---

## Cost Implications

### Seed Task Costs

**ECS Fargate:**
- vCPU: 0.5 vCPU × $0.04048/hour = $0.02024/hour
- Memory: 1 GB × $0.004445/GB/hour = $0.004445/hour
- **Total per run:** ~$0.025/run (~5 minutes)

**Monthly (if run 10 times):**
- $0.25/month

**Negligible cost!** 🎉

---

## Best Practices

### 1. Seed Only When Needed

Don't run seed task on every deployment. Use conditions:

```yaml
# In .github/workflows/post-merge.yml
- name: Check if seeding needed
  id: check_seed
  run: |
    # Check if database is empty
    USERS_COUNT=$(aws rds execute-statement \
      --resource-arn <rds-arn> \
      --secret-arn <secret-arn> \
      --database club_auth_db \
      --sql "SELECT COUNT(*) FROM users" \
      --query 'records[0][0].longValue' \
      --output text)
    
    if [ "$USERS_COUNT" == "0" ]; then
      echo "needs_seed=true" >> $GITHUB_OUTPUT
    else
      echo "needs_seed=false" >> $GITHUB_OUTPUT
    fi

- name: Run database seeding task
  if: steps.check_seed.outputs.needs_seed == 'true'
  run: |
    # ... seed task commands
```

### 2. Version Seed Scripts

Tag seed images with version:

```bash
docker tag seed-scripts:latest ${SEED_ECR}:v1.2.0
docker push ${SEED_ECR}:v1.2.0
```

### 3. Backup Before Seeding

```bash
# Backup RDS before seeding
aws rds create-db-snapshot \
  --db-instance-identifier staging-club-auth-db \
  --db-snapshot-identifier staging-pre-seed-$(date +%Y%m%d-%H%M%S)

# Backup MongoDB via Atlas UI or CLI
```

### 4. Test Locally First

```bash
cd database_script

# Test with local databases
export DB_HOST=localhost
export DB_PORT=5432
export MONGODB_URI=mongodb://localhost:27017/test

python3 seed_all_services_enhanced_v3.py
```

---

## Migration from Manual Process

### Old Process (Manual)

```bash
# 1. SSH tunnel
ssh -i club-ssh-key.pem -N \
    -L 5432:rds-endpoint:5432 \
    -L 27017:docdb-endpoint:27017 \
    ec2-user@bastion-ip

# 2. Run seeds manually
cd database_script
python3 setup_database_environment.py
python3 seed_all_services_enhanced_v3.py
```

### New Process (Automated)

```bash
# Just push to develop!
git push origin develop

# Everything happens automatically ✨
```

**Saved time:** ~15 minutes per deployment

---

## Future Improvements

### Planned Features

1. **Conditional Seeding**
   - Check if database is empty before seeding
   - Skip if already populated

2. **Seed Data Versioning**
   - Track seed data versions
   - Upgrade/downgrade seeds like migrations

3. **Partial Seeding**
   - Seed specific services only
   - Update existing data without full wipe

4. **Seed Validation**
   - Verify data integrity after seeding
   - Check counts, relationships, constraints

5. **Staging Data Refresh**
   - Copy production data to staging (sanitized)
   - Keep staging realistic

---

## Related Documentation

- [Staging Deployment Guide](DEPLOYMENT-GUIDE.md)
- [Pipeline Architecture](../../docs/pipeline-architecture.md)
- [Post-Merge Pipeline README](../../.github/workflows/README-post-merge.md)
- [Terraform Seed Task Config](seed-task.tf)

---

**Last Updated:** January 19, 2026  
**Status:** ✅ Production ready  
**Maintainer:** DevOps Team
