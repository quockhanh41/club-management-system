# Automated Database Seeding - Quick Reference

## 🎯 What Changed?

**Before:** Manual SSH tunnel + Python scripts  
**Now:** Fully automated via GitHub Actions ✨

## 🚀 How to Use

### Automatic (Recommended)
```bash
# Just push to develop!
git push origin develop
```

Database seeding happens automatically after deployment:
1. Post-Merge Pipeline builds seed Docker image
2. Pushes to ECR
3. Runs ECS Fargate task
4. Seeds PostgreSQL + MongoDB
5. Shows logs

### Manual Re-seed
```bash
cd terraform/environments/staging

# Get commands
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

## 📦 What Gets Seeded?

- ✅ **Auth Service (PostgreSQL)**
  - 100+ users with roles
  - Permissions and sessions
  
- ✅ **Club Service (MongoDB)**
  - 25+ clubs across 6 categories
  - Memberships and relationships
  
- ✅ **Event Service (MongoDB)**
  - 100+ events with registrations
  - Recruitment campaigns

## 🔍 Monitor Progress

```bash
# Real-time logs
aws logs tail /ecs/staging-club-management-seed --follow

# Check task status
aws ecs list-tasks --cluster staging-club-cluster --family staging-club-management-seed-task
```

## 🆘 Troubleshooting

### Seed Failed?
```bash
# Check logs
aws logs tail /ecs/staging-club-management-seed --since 1h

# Verify DB connectivity
aws rds describe-db-instances --db-instance-identifier staging-club-auth-db

# Check MongoDB URI
cd terraform/environments/staging
terraform output -raw mongodb_uri
```

### Need to Reset Data?
```bash
# Connect to RDS and drop schema
psql -h <rds-endpoint> -U postgres -d club_auth_db
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Then re-run seed task
```

## 📚 Full Documentation

See [DATABASE-SEEDING-GUIDE.md](terraform/environments/staging/DATABASE-SEEDING-GUIDE.md) for:
- Architecture diagrams
- Configuration details
- Cost analysis
- Best practices
- Advanced troubleshooting

## 💰 Cost

**Per seed run:** ~$0.025 (5 minutes)  
**Monthly (10 runs):** ~$0.25  
**Negligible!** 🎉

---

**No more manual SSH tunneling!** Everything is automated. 🚀
