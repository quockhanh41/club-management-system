# E2E Testing Guide

## Local E2E Testing (Before CI/CD)

Script `scripts/test-e2e-local.sh` cho phép bạn test E2E flow locally trước khi commit vào CI/CD pipeline.

### Prerequisites

- Docker & Docker Compose đã cài đặt
- Git repository đã clone
- Node.js 18+ và npm đã cài đặt

### Quick Start

```bash
# Chạy E2E tests locally
./scripts/test-e2e-local.sh
```

### What the script does

1. **Build Docker images** với CI configuration (production targets)
2. **Start infrastructure** services (PostgreSQL, MongoDB, RabbitMQ)
3. **Wait for databases** to be healthy
4. **Start application services** (auth, club, event, notify, image, frontend)
5. **Wait for services** to be healthy
6. **Run Playwright E2E tests**
7. **Auto cleanup** containers và volumes khi xong

### Script Features

- ✅ Colored console output (info, warnings, errors)
- ✅ Automatic cleanup on exit (success or failure)
- ✅ Health check monitoring với timeout
- ✅ Auto-open test report in browser (macOS)
- ✅ Collect service logs on failure
- ✅ Mirrors Jenkinsfile E2E stage exactly

### Output Locations

- **Test Report**: `playwright-report/index.html`
- **Test Results**: `test-results/`
- **Service Logs**: `logs/services.log` (generated on failure)
- **Artifacts**: `artifacts/`

### Common Issues & Solutions

#### Services fail to start

```bash
# Check service logs
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs [service-name]

# Examples:
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs auth-service
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs postgres
```

#### Ports already in use

```bash
# Stop any running containers
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml down -v

# Or stop all Docker containers
docker stop $(docker ps -aq)
```

#### Rebuild images from scratch

```bash
# Clean up everything and rebuild
docker compose -f docker-compose.yml -f docker-compose.ci.yml build --no-cache
./scripts/test-e2e-local.sh
```

### Manual Testing Steps

Nếu cần test manually từng bước:

```bash
# 1. Build images
docker compose -f docker-compose.yml -f docker-compose.ci.yml build

# 2. Start infrastructure
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml up -d postgres mongo rabbitmq

# 3. Wait ~30 seconds, then start services
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml up -d auth-service club-service event-service notify-service image-service frontend

# 4. Check status
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps

# 5. Run tests
npx playwright test

# 6. View report
open playwright-report/index.html

# 7. Cleanup
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml down -v
```

### Debug Mode

Để xem chi tiết logs trong khi test:

```bash
# Terminal 1: Run script
./scripts/test-e2e-local.sh

# Terminal 2: Follow logs
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs -f
```

### Playwright Options

Customize test execution:

```bash
# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run in headed mode (with browser UI)
npx playwright test --headed

# Run specific project (browser)
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# Update snapshots
npx playwright test --update-snapshots
```

### CI/CD Integration

Script này mirror chính xác logic trong `Jenkinsfile` stage 'E2E Tests'. Nếu tests pass locally với script này, chúng sẽ pass trong Jenkins pipeline.

### Performance Tips

- **First run**: ~5-10 phút (download images, build services)
- **Subsequent runs**: ~3-5 phút (cached images)
- **Services startup**: ~1-2 phút
- **E2E tests**: phụ thuộc số lượng test cases

### Environment Variables

Script sử dụng các biến môi trường từ `.env` file. Đảm bảo file `.env` đã được cấu hình đúng:

```bash
# Check if .env exists
ls -la .env

# View current configuration (không expose sensitive data)
grep -v "PASSWORD\|SECRET\|KEY" .env
```

## Next Steps

1. ✅ Run `./scripts/test-e2e-local.sh` để verify setup
2. ✅ Fix any failing tests locally
3. ✅ Commit changes
4. ✅ Jenkins sẽ chạy same tests automatically

---

**Tip**: Luôn chạy script này trước khi push code để tránh breaking CI/CD pipeline! 🚀
