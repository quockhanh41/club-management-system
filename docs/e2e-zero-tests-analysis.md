# 🔍 Phân Tích: Tại Sao Pipeline Không Thực Thi E2E Tests

## 📌 Tóm Tắt Vấn Đề

Pipeline Jenkins build #58 báo cáo **0 test cases được thực thi** trong stage E2E Tests:
- Total Tests: 0
- Passed: 0
- Failed: 0
- Skipped: 0

## 🎯 Nguyên Nhân Chính

### 1. **Container E2E Runner Crash Trước Khi Chạy Tests**

**Bằng chứng từ log** ([#58.txt](##58.txt#L3403-L3410)):

```bash
+ EXIT_CODE=1
+ echo 📦 Container execution completed with exit code: 1
+ echo 📋 Container logs:
+ docker logs e2e-runner-58
+ echo ==========================================  # <-- EMPTY OUTPUT, no logs from container
```

Container `e2e-runner-58` exit với code 1 **ngay lập tức** mà không in ra bất kỳ log nào từ script `/app/run-tests.sh`. Điều này chứng tỏ:
- Container không khởi động được thành công
- Script entrypoint không được thực thi
- Playwright tests không bao giờ được chạy

### 2. **Docker Build Context Quá Lớn (1.88GB)**

**Bằng chứng từ log** ([#58.txt](##58.txt#L3329-L3336)):

```bash
#6 [internal] load build context
#6 transferring context: 1.88GB 31.8s done
#6 DONE 32.4s
```

**Phân tích:**
- Build context **1.88GB** - gấp nhiều lần kích thước thông thường
- Thời gian transfer context: **32.4 giây** (quá chậm)
- Nguyên nhân: `Dockerfile.e2e` dùng `COPY . .` mà không có `.dockerignore` phù hợp

**Tại sao context lớn?**
- Đang copy toàn bộ workspace
- Bao gồm `node_modules` (~500MB) từ nhiều services
- `playwright-browsers/` (~300MB) đã được install trong Jenkins
- Build artifacts từ stage trước
- Service logs, test-results cũ

**Tác động:**
- Container image quá lớn → khó khởi động
- Có thể gây OOM (Out of Memory) trên Jenkins agent
- Layer caching không hiệu quả

### 3. **Không Có File `.dockerignore` Cho E2E Tests**

**Kiểm tra:**
```bash
$ file_search ".dockerignore"
# Kết quả: chỉ có .dockerignore trong services/, không có ở root
```

Do đó, Docker build context bao gồm **tất cả files** trong workspace, kể cả những files không cần thiết:
- `node_modules/` (đã được npm ci trong stage deps)
- `playwright-browsers/` (đã có trong base image)
- `services/*/node_modules/` (không cần cho E2E tests)
- Build outputs, logs, artifacts

### 4. **Script Analyze Results Không Tìm Thấy Test Files**

**Từ** [scripts/analyze-e2e-results.sh](scripts/analyze-e2e-results.sh#L9-L21):

```bash
for xml_file in $(find $RESULTS_DIR -name "*.xml" 2>/dev/null); do
    if [ -f "$xml_file" ]; then
        tests=$(grep -oP 'tests="\K[0-9]+' "$xml_file" | head -1)
        ...
```

Vì container crash trước khi Playwright chạy:
- Không có file `test-results/e2e-results.xml` được tạo
- Script phân tích trả về `TOTAL_TESTS=0`
- Jenkins hiểu là "không có test nào fail" → SUCCESS

## 🔬 Phân Tích Sâu Hơn

### Tại Sao Container Crash?

**Nguyên nhân có thể:**

1. **Out of Memory (OOM)**
   - Image 1.88GB + Jenkins agent memory
   - Docker có thể kill container nếu vượt memory limit

2. **Script Entrypoint Lỗi**
   - Script `/app/run-tests.sh` có thể có lỗi syntax
   - Permission issues (mặc dù có `chmod +x`)

3. **Missing Dependencies**
   - Node modules không được copy đúng
   - Playwright browsers không accessible

### Playwright Config Issues

Từ [playwright.config.ts](playwright.config.ts#L6):

```typescript
testDir: './tests/e2e',
```

Test directory: `tests/e2e/specs/`

Files có sẵn:
- `00-basic-ui.spec.ts`
- `01-user-authentication.spec.ts`
- `02-club-management.spec.ts`
- `03-event-management.spec.ts`
- `04-user-profile.spec.ts`
- `05-api-integration.spec.ts`

**→ Tests files tồn tại**, nhưng không được chạy do container crash.

## ✅ Giải Pháp

### **Giải Pháp 1: Tạo `.dockerignore` (ƯU TIÊN CAO) ✅**

**Đã thực hiện:** Tạo file `.dockerignore` ở root với nội dung:

```dockerignore
# Dependencies (already copied from deps stage)
node_modules
playwright-browsers/

# Build outputs
.next/
build/
dist/

# Test outputs (old results)
test-results/
playwright-report/
coverage/

# Large unnecessary files
services/*/node_modules/
services/*/dist/
artifacts/
logs/
*.zip
*.tar
```

**Tác động:**
- Giảm build context từ 1.88GB → ~50-100MB
- Build time từ 32s → ~2-5s
- Giảm khả năng OOM

### **Giải Pháp 2: Thêm Health Check và Debug Output**

**Cập nhật Dockerfile.e2e:**

```dockerfile
# Add healthcheck to verify container is running
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD node --version || exit 1

# Add debug output at container start
RUN echo '#!/bin/bash\n\
    set -x  # Enable bash debugging\n\
    echo "🎭 Container starting..."\n\
    echo "Node version: $(node --version)"\n\
    echo "NPM version: $(npm --version)"\n\
    echo "Working dir: $(pwd)"\n\
    echo "Files in /app:"\n\
    ls -la /app\n\
    ...\n\
```

### **Giải Pháp 3: Improve Error Handling trong Jenkinsfile**

**Cập nhật stage E2E Tests:**

```groovy
// Check if container started successfully
sh '''
    if ! docker ps -a | grep e2e-runner-58; then
        echo "❌ Container not found!"
        exit 1
    fi
    
    # Wait a bit for container to initialize
    sleep 5
    
    # Check container status
    STATUS=$(docker inspect -f '{{.State.Status}}' e2e-runner-58)
    if [ "$STATUS" != "running" ] && [ "$STATUS" != "exited" ]; then
        echo "❌ Container in unexpected state: $STATUS"
        docker logs e2e-runner-58
        exit 1
    fi
'''
```

### **Giải Pháp 4: Verify Test Files trong Container**

**Add kiểm tra vào run-tests.sh:**

```bash
# Verify test files exist
echo "📁 Listing test files..."
TEST_COUNT=$(find tests/e2e -name "*.spec.ts" | wc -l)
if [ "$TEST_COUNT" -eq 0 ]; then
    echo "❌ ERROR: No test files found!"
    echo "Directory structure:"
    find tests/e2e -type f
    exit 1
fi
echo "✅ Found $TEST_COUNT test files"
```

## 📊 Kết Luận

**Vấn đề chính:**
1. ❌ Docker build context quá lớn (1.88GB) → Container crash/OOM
2. ❌ Thiếu `.dockerignore` → Copy quá nhiều files không cần thiết
3. ❌ Container exit code 1 trước khi chạy tests
4. ⚠️  Script analyze-e2e-results.sh không phát hiện được vấn đề

**Giải pháp đã áp dụng:**
1. ✅ Tạo `.dockerignore` để giảm build context
2. 📋 Đề xuất thêm health check và debug output
3. 📋 Đề xuất improve error handling trong Jenkins

**Bước tiếp theo:**
1. Commit file `.dockerignore` mới
2. Re-run Jenkins pipeline
3. Kiểm tra build context size đã giảm chưa
4. Xem container logs có xuất hiện chưa
5. Nếu vẫn fail, áp dụng giải pháp 2, 3, 4

## 🔗 Tham Khảo

- [#58.txt](##58.txt) - Jenkins build log
- [Dockerfile.e2e](Dockerfile.e2e) - E2E test runner Dockerfile
- [playwright.config.ts](playwright.config.ts) - Playwright configuration
- [scripts/analyze-e2e-results.sh](scripts/analyze-e2e-results.sh) - Result analysis script
