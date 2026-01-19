# Production Database Seeding - Manual Trigger

## ✅ Đã Implement

Production đã được setup automated database seeding với **manual trigger only** (không tự động chạy).

### 📁 Files Đã Tạo

1. **[terraform/environments/production/seed-task.tf](terraform/environments/production/seed-task.tf)**
   - ECS task definition cho seed scripts
   - ECR repository: `production-club-management-seed-scripts`
   - IAM roles với SSM parameter access
   - CloudWatch log group: `/ecs/production-club-management-seed`
   - Task config: 512 CPU, 1GB memory
   - Retention: 30 days (longer cho production)

2. **[.github/workflows/seed-production.yml](.github/workflows/seed-production.yml)**
   - GitHub Actions workflow với **workflow_dispatch** (manual trigger only)
   - Safety confirmation: Phải gõ "SEED_PRODUCTION" để confirm
   - Build & push seed scripts image
   - Run ECS task
   - Wait & check exit code
   - Show logs và summary

3. **Updated [terraform/environments/production/variables.tf](terraform/environments/production/variables.tf)**
   - Thêm cloudinary variables cho seed scripts

---

## 🚀 Cách Sử Dụng

### Option 1: GitHub Actions (Recommended)

1. Vào GitHub repository
2. **Actions** → **Seed Production Database (Manual)**
3. Click **Run workflow**
4. Nhập:
   - **confirm**: `SEED_PRODUCTION` (bắt buộc phải gõ đúng)
   - **seed_version**: `latest` hoặc version cụ thể
5. Click **Run workflow**
6. Đợi workflow hoàn thành (~5-10 phút)

**Safety Features:**
- ✅ Manual trigger only (không bao giờ tự động chạy)
- ✅ Phải confirm bằng cách gõ "SEED_PRODUCTION"
- ✅ Environment protection (nếu có setup)
- ✅ Full logging và monitoring

### Option 2: Terraform + AWS CLI

```bash
# 1. Apply terraform để tạo resources
cd terraform/environments/production
terraform init
terraform apply

# 2. Build & push seed scripts image
cd ../../../database_script
docker build --platform linux/amd64 -t seed-scripts:latest .

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin <ECR_REPO_URL>

# Push image
docker tag seed-scripts:latest <ECR_REPO_URL>:latest
docker push <ECR_REPO_URL>:latest

# 3. Run seed task
aws ecs run-task \
  --cluster production-club-cluster \
  --task-definition production-club-management-seed-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_ID>],securityGroups=[<SG_ID>],assignPublicIp=DISABLED}" \
  --region ap-southeast-1

# 4. View logs
aws logs tail /ecs/production-club-management-seed --follow
```

**Terraform output commands:**
```bash
terraform output seed_task_commands          # Full commands
terraform output seed_task_build_commands    # Quick build/push
```

---

## ⚠️ Quan Trọng

### 🔴 Production Safety

1. **KHÔNG tự động chạy** - Chỉ manual trigger
2. **Backup data trước** khi seed
3. **Test trên staging trước** 
4. **Seed sẽ overwrite data** - Cẩn thận!
5. **Verify data sau** khi seed xong

### 📋 Checklist Trước Khi Seed

- [ ] Backup production databases
- [ ] Test seed scripts trên staging
- [ ] Review seed data
- [ ] Notify team members
- [ ] Schedule maintenance window (nếu cần)
- [ ] Monitor CloudWatch logs
- [ ] Verify application sau khi seed

### 🔍 Monitoring

**CloudWatch Logs:**
```bash
aws logs tail /ecs/production-club-management-seed --follow
```

**Task Status:**
```bash
aws ecs describe-tasks \
  --cluster production-club-cluster \
  --tasks <TASK_ARN>
```

**Database Check:**
```bash
# RDS
aws rds describe-db-instances \
  --db-instance-identifier production-club-postgres

# Check connections
psql -h <RDS_ENDPOINT> -U dbadmin -d auth_db -c "SELECT COUNT(*) FROM users;"
```

---

## 🔧 Configuration

### Environment Variables (trong seed-task.tf)

```hcl
DB_HOST                   = module.databases.rds_endpoint
DB_PORT                   = "5432"
DB_USER                   = "dbadmin"
DB_NAME                   = "auth_db"
MONGODB_URI               = var.mongodb_uri
CLOUDINARY_CLOUD_NAME     = var.cloudinary_cloud_name
CLOUDINARY_API_KEY        = var.cloudinary_api_key
SEED_BATCH_SIZE           = "100"
SEED_TIMEOUT_SECONDS      = "600"
```

### Secrets (SSM Parameter Store)

```
/production/club-management/db_password
/production/club-management/cloudinary_secret
```

---

## 📊 So Sánh với Staging

| Feature | Staging | Production |
|---------|---------|------------|
| **Trigger** | Auto (Post-Merge) | Manual only |
| **Confirmation** | ❌ None | ✅ Must type "SEED_PRODUCTION" |
| **Log Retention** | 7 days | 30 days |
| **Safety** | Low risk | High risk - requires caution |
| **Backup** | Optional | **REQUIRED** |

---

## 🎯 Next Steps

1. **Deploy Terraform:**
   ```bash
   cd terraform/environments/production
   terraform init
   terraform plan
   terraform apply
   ```

2. **Test Manual Trigger:**
   - Go to GitHub Actions
   - Run workflow
   - Verify logs & data

3. **Document Process:**
   - Add to runbook
   - Train team members
   - Create backup procedures

---

## 📖 Related Docs

- [terraform/environments/staging/seed-task.tf](terraform/environments/staging/seed-task.tf) - Staging config (auto-run)
- [database_script/README.md](database_script/README.md) - Seed scripts documentation
- [.github/workflows/post-merge.yml](.github/workflows/post-merge.yml) - Staging auto-seed
- [DATABASE-SEEDING-GUIDE.md](DATABASE-SEEDING-GUIDE.md) - Complete seeding guide

---

**Created:** 2026-01-19  
**Status:** ✅ Ready for deployment
