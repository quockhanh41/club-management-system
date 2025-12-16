# Kế hoạch học tập & Thực hành: Introduction to Containers (IBM)
## Áp dụng trên dự án Club Management System

Tài liệu này chi tiết hóa cách bạn sẽ học khóa học IBM Coursera bằng cách thực hành trực tiếp trên source code `club-management-system` hiện có.

---

## Giai đoạn 1: Docker Fundamentals (Tuần 1-2)
**Mục tiêu:** Hiểu sâu về Docker Image, Container, Network và Volume thông qua việc "mổ xẻ" dự án hiện tại.

### Bài tập 1: Phân tích và Tối ưu hóa Dockerfile
*   **Lý thuyết:** Layers, Multistage builds, Caching.
*   **Thực hành:**
    *   [ ] Đọc `services/auth/Dockerfile`. Giải thích từng dòng lệnh (`FROM`, `WORKDIR`, `COPY`, `RUN`). Tại sao `COPY package.json` lại nằm trước `COPY .`?
    *   [ ] **Thử thách:** Kiểm tra xem `services/club/Dockerfile` đã sử dụng *Multistage Build* chưa? Nếu chưa, hãy viết lại để giảm dung lượng image cuối cùng (chỉ giữ lại production dependencies).

### Bài tập 2: "Cai nghiện" Docker Compose (Manual Networking)
*   **Lý thuyết:** Docker Bridge Network, DNS resolution trong Docker.
*   **Thực hành:**
    *   Dự án đang dùng `docker-compose` để tự động nối mạng. Hãy thử làm thủ công cho 2 service: `club-service` và `mongodb`.
    *   [ ] Tạo network: `docker network create club-manual-net`
    *   [ ] Run Mongo: `docker run -d --name my-mongo --net club-manual-net mongo:latest`
    *   [ ] Run Club Service: Build image và run container, truyền biến môi trường `MONGODB_URI` trỏ tới `my-mongo` (không phải localhost).
    *   **Kết quả:** `club-service` kết nối được DB mà không cần file compose.

---

## Giai đoạn 2: Kubernetes Basics (Tuần 3)
**Mục tiêu:** Chuyển đổi kiến trúc từ Docker Compose sang Kubernetes (Minikube/Docker Desktop K8s).

### Bài tập 3: Viết Manifest đầu tiên (Pod & Deployment)
*   **Lý thuyết:** Pod lifecycle, Deployment, ReplicaSet.
*   **Thực hành:**
    *   Tạo thư mục `k8s/`.
    *   [ ] Viết `k8s/auth-deployment.yaml`: Định nghĩa Deployment cho `auth-service`.
        *   Replicas: 1.
        *   Env vars: Chuyển từ `docker-compose.yml` sang.
    *   [ ] Apply: `kubectl apply -f k8s/auth-deployment.yaml`.
    *   [ ] Debug: Dùng `kubectl logs` và `kubectl describe` nếu pod báo lỗi (thường là lỗi kết nối DB vì chưa deploy DB).

### Bài tập 4: Service discovery & Networking
*   **Lý thuyết:** ClusterIP, NodePort, LoadBalancer.
*   **Thực hành:**
    *   [ ] Viết `k8s/auth-service.yaml`: Expose `auth-service` ra trong cluster (ClusterIP).
    *   [ ] Deploy Database (Postgres) lên K8s (dùng StatefulSet hoặc Deployment đơn giản).
    *   **Thử thách:** Làm sao để `auth-service` tìm thấy `postgres`? (Gợi ý: Dùng tên Service làm DNS name).

---

## Giai đoạn 3: Kubernetes nâng cao & OpenShift (Tuần 4-5)
**Mục tiêu:** Quản lý cấu hình, bảo mật và vận hành theo chuẩn Cloud Native.

### Bài tập 5: ConfigMaps & Secrets
*   **Lý thuyết:** Tách biệt Config và Code (12-factor key).
*   **Thực hành:**
    *   [ ] Tạo `k8s/configmap.yaml` cho các biến không mật (PORT, NODE_ENV).
    *   [ ] Tạo `k8s/secret.yaml` cho `DATABASE_URL`, `JWT_SECRET`.
    *   [ ] Cập nhật `auth-deployment.yaml` để load biến môi trường từ ConfigMap và Secret.

### Bài tập 6: Scaling & Rolling Updates
*   **Lý thuyết:** High Availability, Zero-downtime deployment.
*   **Thực hành:**
    *   [ ] Scale `club-service` lên 3 replicas: `kubectl scale deployment club-service --replicas=3`.
    *   [ ] Quan sát load balancing (có thể dùng `kubectl port-forward` và request liên tục).
    *   [ ] Cập nhật image phiên bản mới (giả lập) và xem quá trình Rolling Update diễn ra như thế nào.

### Bài tập 7: OpenShift Simulation (Ingress)
*   **Lý thuyết:** OpenShift Route ~ K8s Ingress.
*   **Thực hành:**
    *   Thay vì dùng `kong` container như trong docker-compose, chúng ta sẽ cài **Ingress Controller** (Nginx hoặc Kong Ingress) trên K8s.
    *   [ ] Viết `ingress.yaml` để route traffic:
        *   `club.local/api/v1/auth` -> `auth-service`
        *   `club.local/api/v1/clubs` -> `club-service`

---

## Tổng kết
Hoàn thành lộ trình này, bạn sẽ có một bộ `k8s manifests` hoàn chỉnh thay thế cho `docker-compose.yml`. Đây chính là sản phẩm "Final Project" của bạn.
