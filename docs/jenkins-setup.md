# Jenkins CI/CD Setup Guide

## Tổng quan

Hướng dẫn này giúp bạn thiết lập Jenkins CI/CD cho hệ thống Club Management System. Pipeline tự động hóa các công việc: build, test, scan security, và deploy.

## 📋 Yêu cầu

- Docker và Docker Compose đã cài đặt
- Git
- Ít nhất 4GB RAM và 20GB dung lượng đĩa trống
- Port 8080 (Jenkins UI), 50000 (Jenkins Agent), 5000 (Docker Registry) có sẵn

## 🚀 Cài đặt nhanh

### Bước 1: Khởi động Jenkins

```bash
# Chạy script setup
./scripts/jenkins-setup.sh start
```

Script này sẽ:
- Khởi động Jenkins, Jenkins Agent, Docker Registry, và Nginx
- Hiển thị mật khẩu admin ban đầu
- Chờ Jenkins sẵn sàng

### Bước 2: Truy cập Jenkins UI

1. Mở trình duyệt và truy cập: http://localhost:8080
2. Nhập mật khẩu admin (đã hiển thị ở bước 1)
3. Chọn "Install suggested plugins"
4. Tạo tài khoản admin

### Bước 3: Cài đặt công cụ

```bash
# Cài Docker và Node.js trong Jenkins container
./scripts/jenkins-setup.sh install-tools

# Cài các plugin cần thiết
./scripts/jenkins-setup.sh install-plugins

# Khởi động lại Jenkins
./scripts/jenkins-setup.sh restart
```

### Bước 4: Cấu hình Credentials

1. Truy cập: http://localhost:8080/credentials/
2. Chọn "System" → "Global credentials" → "Add Credentials"

Thêm các credentials sau:

#### Docker Registry Credentials
- **Kind**: Username with password
- **ID**: `docker-registry-credentials`
- **Username**: admin (hoặc username registry của bạn)
- **Password**: (password registry của bạn)

#### Docker Registry URL
- **Kind**: Secret text
- **ID**: `docker-registry-url`
- **Secret**: `localhost:5000` (hoặc URL registry của bạn)

#### AWS Credentials (nếu deploy lên AWS)
- **Kind**: AWS Credentials
- **ID**: `aws-credentials`
- **Access Key ID**: (AWS access key)
- **Secret Access Key**: (AWS secret key)

### Bước 5: Tạo Pipeline Job

1. Từ Jenkins dashboard, chọn "New Item"
2. Nhập tên: `club-management-pipeline`
3. Chọn "Pipeline" và nhấn OK
4. Trong phần "Pipeline":
   - **Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: URL repo của bạn
   - **Script Path**: `Jenkinsfile`
5. Nhấn "Save"

### Bước 6: Chạy Pipeline

1. Nhấn "Build Now"
2. Xem tiến trình trong "Console Output"

## 📊 Pipeline Stages

Pipeline bao gồm các stages sau:

### 1. **Checkout**
- Clone code từ Git repository
- Lấy thông tin commit

### 2. **Setup Environment**
- Cài đặt Node.js dependencies
- Cài đặt Playwright browsers

### 3. **Lint & Code Quality**
- Kiểm tra code style (backend & frontend)
- Chạy song song để tiết kiệm thời gian

### 4. **Unit Tests**
- Chạy unit tests cho tất cả services
- Tạo báo cáo JUnit

### 5. **Build Docker Images**
- Build Docker images cho tất cả services
- Tag với build number và git commit

### 6. **E2E Tests**
- Khởi động tất cả services
- Chạy Playwright E2E tests
- Tạo HTML report

### 7. **Tag & Push Images** (chỉ cho main/develop/staging branches)
- Tag images với version
- Push lên Docker Registry

### 8. **Deploy** (chỉ cho main/develop/staging branches)
- Deploy lên môi trường tương ứng
- Dev → develop branch
- Staging → staging branch
- Production → main branch

### 9. **Security Scan** (chỉ cho main/develop branches)
- Scan Docker images với Trivy
- Tìm vulnerabilities (HIGH, CRITICAL)

## 🛠️ Scripts hỗ trợ

### jenkins-setup.sh

Script quản lý Jenkins:

```bash
# Khởi động Jenkins
./scripts/jenkins-setup.sh start

# Cài đặt công cụ (Docker, Node.js)
./scripts/jenkins-setup.sh install-tools

# Cài đặt plugins
./scripts/jenkins-setup.sh install-plugins

# Hiển thị hướng dẫn cấu hình credentials
./scripts/jenkins-setup.sh credentials

# Dừng Jenkins
./scripts/jenkins-setup.sh stop

# Khởi động lại Jenkins
./scripts/jenkins-setup.sh restart

# Xem logs
./scripts/jenkins-setup.sh logs
```

### jenkins-build.sh

Script build Docker images:

```bash
# Build tất cả services
./scripts/jenkins-build.sh build

# Tag và push images
./scripts/jenkins-build.sh push <tag>

# Tag và push as latest
./scripts/jenkins-build.sh latest

# Xóa dangling images
./scripts/jenkins-build.sh clean

# Hiển thị images hiện tại
./scripts/jenkins-build.sh show

# Build và push
./scripts/jenkins-build.sh all <tag>
```

### jenkins-deploy.sh

Script deploy services:

```bash
# Deploy to dev
./scripts/jenkins-deploy.sh dev <image-tag>

# Deploy to staging
./scripts/jenkins-deploy.sh staging <image-tag>

# Deploy to production
./scripts/jenkins-deploy.sh production <image-tag>
```

## 🔧 Cấu hình nâng cao

### Cấu hình Docker Registry

Sử dụng Docker Registry riêng:

1. Cập nhật `docker-compose.jenkins.yml`:
```yaml
registry:
  environment:
    - REGISTRY_HTTP_SECRET=<your-secret>
```

2. Cập nhật credentials trong Jenkins

### Cấu hình Deployment

Chỉnh sửa stage "Deploy to Environment" trong `Jenkinsfile`:

```groovy
stage('Deploy to Environment') {
    steps {
        script {
            // Thêm logic deployment của bạn
            // Ví dụ: kubectl, docker-compose, AWS ECS, etc.
        }
    }
}
```

### Notifications

Thêm notifications trong `Jenkinsfile` post section:

```groovy
post {
    success {
        // Email
        emailext(
            subject: "Build Success: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            body: "Build completed successfully",
            to: "team@example.com"
        )
        
        // Slack
        slackSend(
            color: 'good',
            message: "Build Success: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        )
    }
}
```

## 📈 Monitoring & Reports

### Build Reports

Truy cập các báo cáo:
- **Playwright Report**: http://localhost:8080/job/club-management-pipeline/Playwright_E2E_Test_Report/
- **JUnit Results**: http://localhost:8080/job/club-management-pipeline/lastBuild/testReport/
- **Console Output**: http://localhost:8080/job/club-management-pipeline/lastBuild/console

### Blue Ocean UI

Giao diện hiện đại cho Jenkins:
- Truy cập: http://localhost:8080/blue/organizations/jenkins/club-management-pipeline/

## 🔒 Security Best Practices

1. **Credentials Management**
   - Không hardcode credentials trong code
   - Sử dụng Jenkins Credentials Store
   - Rotate credentials định kỳ

2. **Image Scanning**
   - Pipeline tự động scan với Trivy
   - Review security reports trước khi deploy

3. **Access Control**
   - Cấu hình role-based access control
   - Limit quyền truy cập production

4. **Audit Logs**
   - Enable audit logging trong Jenkins
   - Monitor suspicious activities

## 🐛 Troubleshooting

### Pipeline fails at Docker build

```bash
# Kiểm tra Docker trong Jenkins container
docker exec jenkins-master docker ps

# Kiểm tra permissions
docker exec jenkins-master ls -la /var/run/docker.sock
```

### E2E tests timeout

```bash
# Tăng timeout trong Jenkinsfile
environment {
    E2E_TIMEOUT = '900' // 15 minutes
}

# Hoặc trong playwright.config.ts
timeout: 90000
```

### Out of memory

```bash
# Tăng memory cho Jenkins
# Cập nhật docker-compose.jenkins.yml
services:
  jenkins:
    environment:
      - JAVA_OPTS=-Xmx2048m -XX:MaxPermSize=512m
```

### Cannot push to registry

```bash
# Kiểm tra registry
curl http://localhost:5000/v2/_catalog

# Test authentication
docker login localhost:5000
```

## 📚 Tài liệu tham khảo

- [Jenkins Official Documentation](https://www.jenkins.io/doc/)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Docker Documentation](https://docs.docker.com/)
- [Playwright Documentation](https://playwright.dev/)

## 🆘 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra logs: `./scripts/jenkins-setup.sh logs`
2. Xem console output của build
3. Tham khảo phần Troubleshooting
4. Liên hệ team DevOps

## 📝 Changelog

### Version 1.0.0 (2026-01-07)
- Initial Jenkins CI/CD setup
- Pipeline với full stages: build, test, scan, deploy
- Scripts hỗ trợ setup và deployment
- Docker Registry integration
- E2E testing với Playwright
- Security scanning với Trivy
