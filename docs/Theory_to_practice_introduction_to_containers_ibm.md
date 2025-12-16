# TÀI LIỆU TỔNG HỢP KIẾN THỨC & THỰC HÀNH DỰ ÁN
## Introduction to Containers w/ Docker, Kubernetes & OpenShift (IBM)

---

## 1. Mục tiêu của tài liệu
Tài liệu này nhằm:
- Hệ thống hóa **toàn bộ kiến thức cốt lõi** trong khóa học của IBM
- Chuyển hóa kiến thức lý thuyết thành **kỹ năng thực hành thực tế**
- Đề xuất **một dự án hoàn chỉnh** áp dụng Docker, Kubernetes và OpenShift

Phù hợp cho:
- Sinh viên CNTT / Kỹ thuật phần mềm
- Backend / Fullstack Developer muốn tiếp cận DevOps
- Người mới học container & cloud-native

---

## 2. Kiến thức cốt lõi trong khóa học

### 2.1. Container & Containerization

#### 2.1.1. Khái niệm
- **Container**: Môi trường chạy ứng dụng cô lập, nhẹ, dùng chung kernel OS
- **Containerization**: Đóng gói ứng dụng + dependencies thành container

#### 2.1.2. So sánh
| Virtual Machine | Container |
|-----------------|-----------|
| Nặng | Nhẹ |
| Có OS riêng | Dùng chung OS |
| Khởi động chậm | Khởi động nhanh |

#### 2.1.3. Lợi ích
- Chạy nhất quán trên mọi môi trường
- Dễ scale, dễ deploy
- Phù hợp CI/CD

---

### 2.2. Docker

#### 2.2.1. Thành phần chính
- **Docker Image**: Template bất biến
- **Docker Container**: Instance của image
- **Dockerfile**: File định nghĩa cách build image
- **Docker Registry**: Nơi lưu trữ image (Docker Hub)

#### 2.2.2. Kiến thức trọng tâm
- Docker CLI (`build`, `run`, `ps`, `exec`, `logs`)
- Layer & cache
- Expose port
- Environment variables

#### 2.2.3. Dockerfile cơ bản
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

### 2.3. Kubernetes (K8s)

#### 2.3.1. Mục đích
Kubernetes dùng để:
- Orchestrate containers
- Tự động scale, self-healing
- Quản lý deployment

#### 2.3.2. Kiến trúc
- **Cluster** = Control Plane + Worker Nodes
- Control Plane: API Server, Scheduler, Controller, etcd

#### 2.3.3. Đối tượng (Objects)
- **Pod**: Đơn vị nhỏ nhất
- **Deployment**: Quản lý pod lifecycle
- **Service**: Expose ứng dụng
- **ReplicaSet**: Đảm bảo số lượng pod

#### 2.3.4. File YAML
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: myapp:1.0
```

---

### 2.4. Quản lý cấu hình & bảo mật

#### 2.4.1. ConfigMap
- Lưu cấu hình không nhạy cảm
- Tách config khỏi source code

#### 2.4.2. Secret
- Lưu mật khẩu, token, key
- Encode base64

#### 2.4.3. Autoscaling
- HPA (Horizontal Pod Autoscaler)
- Scale dựa trên CPU / Memory

---

### 2.5. OpenShift

#### 2.5.1. OpenShift là gì
- Nền tảng PaaS dựa trên Kubernetes
- Do Red Hat phát triển
- Bảo mật & enterprise-ready

#### 2.5.2. Điểm khác biệt với Kubernetes
- Có Web Console
- ImageStream
- BuildConfig
- Route (thay cho Ingress)

#### 2.5.3. OpenShift CLI
- `oc login`
- `oc new-app`
- `oc expose`

---

## 3. Dự án thực hành đề xuất

### 3.1. Mô tả dự án
**Tên dự án:** Containerized Guestbook Application

**Chức năng:**
- Người dùng nhập lời nhắn
- Backend lưu dữ liệu
- Frontend hiển thị danh sách

**Kiến trúc:**
```
Browser
  ↓
Frontend (Container)
  ↓
Backend API (Container)
  ↓
Redis / Database (Container)
```

---

### 3.2. Giai đoạn 1 – Docker hóa ứng dụng

#### Việc cần làm
- Viết Dockerfile cho frontend & backend
- Build image
- Push image lên Docker Hub

#### Kỹ năng đạt được
- Dockerfile
- Image versioning
- Container networking

---

### 3.3. Giai đoạn 2 – Deploy với Kubernetes

#### Việc cần làm
- Tạo Deployment cho mỗi service
- Tạo Service để expose
- Sử dụng ConfigMap cho env
- Tạo Secret cho database password

#### Kỹ năng đạt được
- kubectl
- YAML
- Service discovery

---

### 3.4. Giai đoạn 3 – Scaling & Update

#### Việc cần làm
- Scale replicas
- Rolling update image version
- Test self-healing (delete pod)

#### Kỹ năng đạt được
- High availability
- Zero-downtime deployment

---

### 3.5. Giai đoạn 4 – OpenShift

#### Việc cần làm
- Deploy lại project trên OpenShift
- Dùng `oc new-app` từ Git repo
- Tạo Route để public app

#### Kỹ năng đạt được
- PaaS workflow
- OpenShift Web Console
- CI/CD tư duy

---

## 4. Năng lực đạt được sau dự án

Sau khi hoàn thành, bạn có thể:
- Docker hóa bất kỳ backend nào
- Triển khai ứng dụng cloud-native
- Hiểu workflow Dev → Build → Deploy
- Đọc & viết YAML Kubernetes
- Tự tin làm việc với DevOps team

---

## 5. Gợi ý mở rộng
- CI/CD với GitHub Actions
- Helm Chart
- Monitoring (Prometheus, Grafana)
- Logging (ELK stack)

---

## 6. Kết luận
Khóa học IBM không chỉ dạy công cụ, mà dạy **tư duy cloud-native**:
> "Build once – Run anywhere – Scale automatically"

Nếu bạn làm trọn dự án này, bạn đã có **một sản phẩm đủ tốt để đưa vào CV**.

---

*(Tài liệu này có thể dùng làm handout, báo cáo môn học hoặc base cho đồ án DevOps)*

