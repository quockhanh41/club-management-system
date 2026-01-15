# Jenkins Distributed Architecture Setup Guide

## 📋 Tổng quan

Hướng dẫn này giúp bạn thiết lập kiến trúc Jenkins phân tán (Distributed Jenkins) với:
- ✅ **Controller không chạy builds** (best practice cho security và stability)
- ✅ **4 agents chuyên biệt** với vai trò riêng biệt
- ✅ **Agent assignment rõ ràng** trong pipeline
- ✅ **Resource isolation** và khả năng scale

---

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    JENKINS CONTROLLER                        │
│                  (executors = 0, NO BUILDS)                  │
│                                                              │
│  - Quản lý UI và workflow                                    │
│  - Lưu trữ configuration                                     │
│  - Điều phối agents                                          │
└───────────────────┬──────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┬───────────┬───────────┐
        │                       │           │           │
┌───────▼────────┐   ┌─────────▼──────┐  ┌─▼──────┐  ┌─▼──────┐
│  BUILD AGENT   │   │   TEST AGENT   │  │  E2E   │  │ DEPLOY │
│                │   │                │  │ AGENT  │  │ AGENT  │
├────────────────┤   ├────────────────┤  ├────────┤  ├────────┤
│ Labels:        │   │ Labels:        │  │Labels: │  │Labels: │
│ - build        │   │ - test         │  │- e2e   │  │- deploy│
│ - docker       │   │ - unit-test    │  │- docker│  │- docker│
│ - lint         │   │ - node         │  │- playwg│  │- aws   │
│ - node         │   │                │  │- testin│  │- prod  │
├────────────────┤   ├────────────────┤  ├────────┤  ├────────┤
│ Capabilities:  │   │ Capabilities:  │  │Caps:   │  │Caps:   │
│ - Docker       │   │ - Node.js 18   │  │- Docker│  │- Docker│
│ - Node.js 18   │   │ - npm/pnpm     │  │- Chrome│  │- AWS   │
│ - npm/pnpm     │   │ - Jest         │  │- Playwg│  │- kubectl│
│ - ESLint       │   │                │  │        │  │        │
└────────────────┘   └────────────────┘  └────────┘  └────────┘
```

---

## 🚀 Khởi động nhanh

### Bước 1: Khởi động Jenkins Infrastructure

```bash
# Khởi động controller và tất cả agents
docker-compose -f docker-compose.jenkins.yml up -d

# Kiểm tra trạng thái
docker-compose -f docker-compose.jenkins.yml ps
```

### Bước 2: Truy cập Jenkins Controller

1. Mở trình duyệt: http://localhost:8080
2. Lấy initial admin password:

```bash
docker exec jenkins-controller cat /var/jenkins_home/secrets/initialAdminPassword
```

3. Hoàn tất setup wizard:
   - Install suggested plugins
   - Tạo admin user
   - Verify URL: http://localhost:8080

### Bước 3: Lấy Agent Secrets

Sau khi Jenkins controller khởi động, bạn cần lấy secret cho từng agent:

```bash
# Vào Jenkins UI > Manage Jenkins > Manage Nodes and Clouds
```

Hoặc sử dụng Jenkins CLI:

```bash
# Cài Jenkins CLI
wget http://localhost:8080/jnlpJars/jenkins-cli.jar

# Lấy secret cho mỗi agent
java -jar jenkins-cli.jar -s http://localhost:8080/ -auth admin:<password> \
  get-node build-agent | grep secret
```

### Bước 4: Cấu hình Agent Secrets

Tạo file `.env` trong root directory:

```bash
# .env
JENKINS_BUILD_AGENT_SECRET=<secret-from-jenkins>
JENKINS_TEST_AGENT_SECRET=<secret-from-jenkins>
JENKINS_E2E_AGENT_SECRET=<secret-from-jenkins>
JENKINS_DEPLOY_AGENT_SECRET=<secret-from-jenkins>
```

**QUAN TRỌNG**: Thêm `.env` vào `.gitignore`

### Bước 5: Khởi động Agents

#### Option 1: Sử dụng helper script (Recommended)

```bash
# Start each agent with its secret
./scripts/start-jenkins-agent.sh build-agent <SECRET>
./scripts/start-jenkins-agent.sh test-agent <SECRET>
./scripts/start-jenkins-agent.sh e2e-agent <SECRET>
./scripts/start-jenkins-agent.sh deploy-agent <SECRET>

# Verify
docker ps | grep jenkins-agent
```

#### Option 2: Manual docker run

```bash
# Example for build-agent
docker run -d \
    --name jenkins-agent-build-agent \
    --restart unless-stopped \
    --network club-management-system_jenkins-network \
    --privileged \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /usr/bin/docker:/usr/bin/docker \
    -e JENKINS_URL=http://jenkins:8080 \
    -e JENKINS_AGENT_NAME=build-agent \
    -e JENKINS_SECRET=<YOUR_SECRET> \
    -e JENKINS_AGENT_WORKDIR=/home/jenkins/agent \
    jenkins/inbound-agent:latest-jdk17
```

#### Option 3: Uncomment trong docker-compose.yml

1. Edit `docker-compose.jenkins.yml`
2. Uncomment agent services
3. Add secrets to `.env`
4. Run: `docker-compose -f docker-compose.jenkins.yml up -d`

---

## 📊 Chi tiết các Agents

### 1. Build Agent (`build-agent`)

**Labels**: `build`, `docker`, `lint`, `node`

**Nhiệm vụ**:
- Checkout source code
- Setup Node.js environment
- Install dependencies
- Lint code (backend & frontend)
- Build Docker images

**Stages sử dụng**:
- ✅ Checkout
- ✅ Setup Environment
- ✅ Lint & Code Quality

**Resources**:
- Docker socket access
- Node.js 18
- npm/pnpm

---

### 2. Test Agent (`test-agent`)

**Labels**: `test`, `unit-test`, `node`

**Nhiệm vụ**:
- Chạy unit tests
- Chạy integration tests
- Generate coverage reports

**Stages sử dụng**:
- ✅ Unit Tests

**Resources**:
- Node.js 18
- Jest test framework
- Coverage tools

**Đặc điểm**:
- Không cần Docker socket (isolated testing)
- Lightweight và nhanh

---

### 3. E2E Agent (`e2e-agent`)

**Labels**: `e2e`, `docker`, `playwright`, `testing`

**Nhiệm vụ**:
- Start Docker infrastructure (DBs, services)
- Run Playwright E2E tests
- Collect test artifacts
- Analyze test results

**Stages sử dụng**:
- ✅ E2E Tests

**Resources**:
- Docker socket access
- Playwright + Chromium
- Network access to services

**Đặc điểm**:
- Cần nhiều resources (CPU, RAM)
- Privileged mode cho Docker-in-Docker

---

### 4. Deploy Agent (`deploy-agent`)

**Labels**: `deploy`, `docker`, `aws`, `production`

**Nhiệm vụ**:
- Tag và push Docker images
- Deploy to environments (dev/staging/prod)
- Run deployment scripts
- Verify deployments

**Stages sử dụng**:
- ✅ Tag & Push Images
- ✅ Deploy to Environment
- ✅ Security Scan

**Resources**:
- Docker socket access
- AWS CLI và credentials
- kubectl (nếu dùng Kubernetes)

**Đặc điểm**:
- Cần credentials cho cloud providers
- Production access (cẩn thận!)

---

## 🔧 Cấu hình Controller

### Disable Executors trên Controller

Jenkins controller được cấu hình với **0 executors** qua environment variable:

```yaml
environment:
  - JENKINS_OPTS=--executors=0
```

### Verify trong Jenkins UI

1. Truy cập: http://localhost:8080/computer/
2. Click vào "(master)" hoặc "Built-In Node"
3. Click "Configure"
4. Verify: **# of executors = 0**

---

## 📝 Cấu hình Pipeline

Pipeline đã được cấu hình để chỉ định agent rõ ràng cho từng stage:

```groovy
pipeline {
    agent none  // Không chạy trên controller
    
    stages {
        stage('Checkout') {
            agent { label 'build' }  // Chỉ định build agent
            steps { ... }
        }
        
        stage('Unit Tests') {
            agent { label 'test' }  // Chỉ định test agent
            steps { ... }
        }
        
        stage('E2E Tests') {
            agent { label 'e2e' }  // Chỉ định E2E agent
            steps { ... }
        }
        
        stage('Deploy') {
            agent { label 'deploy' }  // Chỉ định deploy agent
            steps { ... }
        }
    }
}
```

---

## 🔍 Monitoring và Troubleshooting

### Kiểm tra Agent Status

#### Qua Jenkins UI:
```
Manage Jenkins > Manage Nodes and Clouds
```

Kiểm tra:
- ✅ Agent online/offline
- ✅ Available executors
- ✅ Workload distribution

#### Qua Docker:
```bash
# Xem logs của agent
docker logs jenkins-agent-build
docker logs jenkins-agent-test
docker logs jenkins-agent-e2e
docker logs jenkins-agent-deploy

# Kiểm tra resource usage
docker stats jenkins-agent-build jenkins-agent-test jenkins-agent-e2e jenkins-agent-deploy
```

### Common Issues

#### Issue 1: Agent không connect

**Triệu chứng**: Agent hiện offline trong Jenkins UI

**Giải pháp**:
```bash
# 1. Kiểm tra agent logs
docker logs jenkins-agent-build

# 2. Verify secret đúng
echo $JENKINS_BUILD_AGENT_SECRET

# 3. Kiểm tra network connectivity
docker exec jenkins-agent-build ping jenkins

# 4. Restart agent
docker-compose -f docker-compose.jenkins.yml restart jenkins-agent-build
```

#### Issue 2: "No agent available"

**Triệu chứng**: Pipeline stuck với message "Waiting for next available executor"

**Giải pháp**:
```bash
# 1. Verify label trong pipeline matches với agent
# Pipeline: agent { label 'build' }
# Agent env: JENKINS_AGENT_LABELS=build docker lint node

# 2. Kiểm tra agent có online không
docker-compose -f docker-compose.jenkins.yml ps

# 3. Kiểm tra agent có busy không
# Vào Jenkins UI > Manage Nodes > click vào agent
```

#### Issue 3: Docker socket permission denied

**Triệu chứng**: Agent không thể chạy Docker commands

**Giải pháp**:
```bash
# Verify Docker socket mount
docker inspect jenkins-agent-build | grep docker.sock

# Verify permissions trong container
docker exec jenkins-agent-build ls -la /var/run/docker.sock

# Fix permissions (nếu cần)
docker exec jenkins-agent-build chmod 666 /var/run/docker.sock
```

#### Issue 4: Agent out of disk space

**Triệu chứng**: Builds fail với disk space errors

**Giải pháp**:
```bash
# Kiểm tra disk usage
docker exec jenkins-agent-e2e df -h

# Clean Docker resources
docker system prune -af --volumes

# Clean workspace
docker exec jenkins-agent-e2e rm -rf /home/jenkins/agent/workspace/*
```

---

## 📈 Scaling và Performance

### Horizontal Scaling

Thêm nhiều agents cho workload cao:

```yaml
# docker-compose.jenkins.yml
services:
  jenkins-agent-build-2:
    image: jenkins/inbound-agent:latest-jdk17
    container_name: jenkins-agent-build-2
    environment:
      - JENKINS_AGENT_NAME=build-agent-2
      - JENKINS_AGENT_LABELS=build docker lint node
      # ... other config
```

### Resource Limits

Giới hạn resources cho mỗi agent:

```yaml
services:
  jenkins-agent-e2e:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### Monitoring Metrics

Theo dõi:
- **Queue time**: Thời gian pipeline đợi agent
- **Build duration**: Thời gian chạy trên mỗi agent
- **Agent utilization**: % thời gian agent busy
- **Concurrent builds**: Số builds đồng thời

---

## 🔐 Security Best Practices

### 1. Controller Isolation
✅ **DONE**: Executors = 0, không build trên controller

### 2. Agent Isolation
- ✅ Test agent không có Docker access
- ✅ Build agent không có AWS credentials
- ✅ Deploy agent có AWS credentials (cẩn thận)

### 3. Network Isolation
```yaml
# Tách network cho các agent groups
networks:
  jenkins-build:
    driver: bridge
  jenkins-deploy:
    driver: bridge
    internal: false  # Cho phép external access
```

### 4. Secrets Management
- ✅ Dùng `.env` file cho agent secrets
- ✅ Không commit secrets vào Git
- ✅ Rotate secrets định kỳ
- ✅ Dùng Jenkins Credentials Plugin cho cloud credentials

---

## 🛠️ Maintenance

### Backup Jenkins Data

```bash
# Backup Jenkins home
docker exec jenkins-controller tar czf /tmp/jenkins-backup.tar.gz /var/jenkins_home
docker cp jenkins-controller:/tmp/jenkins-backup.tar.gz ./backup/

# Backup agent workspaces (nếu cần)
docker run --rm -v jenkins_agent_build_workspace:/data -v $(pwd)/backup:/backup \
  alpine tar czf /backup/build-workspace.tar.gz /data
```

### Update Jenkins

```bash
# Pull latest images
docker-compose -f docker-compose.jenkins.yml pull

# Recreate containers
docker-compose -f docker-compose.jenkins.yml up -d --force-recreate

# Verify
docker-compose -f docker-compose.jenkins.yml ps
```

### Clean Old Builds

Trong Jenkins UI:
```
Manage Jenkins > System Configuration
> Discard Old Builds: Keep only last 10 builds
```

Hoặc trong pipeline:
```groovy
options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
}
```

---

## 📚 Additional Resources

### Jenkins Documentation
- [Using Agents](https://www.jenkins.io/doc/book/using/using-agents/)
- [Distributed Builds](https://www.jenkins.io/doc/book/scaling/architecting-for-scale/)
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)

### Best Practices
- [Jenkins Security Best Practices](https://www.jenkins.io/doc/book/security/)
- [Pipeline Best Practices](https://www.jenkins.io/doc/book/pipeline/pipeline-best-practices/)

### Related Files
- [Jenkinsfile](../Jenkinsfile) - Pipeline configuration
- [docker-compose.jenkins.yml](../docker-compose.jenkins.yml) - Infrastructure
- [jenkins-pipeline-workflow.md](./jenkins-pipeline-workflow.md) - Pipeline workflow details

---

## 🎯 Quick Commands Reference

```bash
# Start all services
docker-compose -f docker-compose.jenkins.yml up -d

# Stop all services
docker-compose -f docker-compose.jenkins.yml down

# View logs
docker-compose -f docker-compose.jenkins.yml logs -f

# Restart specific agent
docker-compose -f docker-compose.jenkins.yml restart jenkins-agent-build

# Check agent status
docker-compose -f docker-compose.jenkins.yml ps

# Clean everything (CAREFUL!)
docker-compose -f docker-compose.jenkins.yml down -v
docker system prune -af --volumes

# Get agent secret from Jenkins
docker exec jenkins-controller cat /var/jenkins_home/secrets/initialAdminPassword
```

---

## ✅ Verification Checklist

Sau khi setup, verify:

- [ ] Jenkins controller có 0 executors
- [ ] Tất cả 4 agents đều online
- [ ] Agents có đúng labels
- [ ] Pipeline có thể checkout code
- [ ] Build agent có thể build Docker images
- [ ] Test agent có thể run unit tests
- [ ] E2E agent có thể run Playwright tests
- [ ] Deploy agent có access đến Docker registry
- [ ] Không có builds nào chạy trên controller
- [ ] Agent secrets được lưu an toàn (.env not in Git)

---

🎉 **Bạn đã hoàn thành setup Jenkins distributed architecture!**

Nếu gặp vấn đề, check [Troubleshooting](#-monitoring-và-troubleshooting) section hoặc mở issue.
