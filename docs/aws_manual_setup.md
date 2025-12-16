# Hướng Dẫn Chi Tiết: Setup Hạ Tầng AWS (ECS Fargate) Cho Người Mới

Tài liệu này được thiết kế dành riêng cho người chưa rành về AWS. Chúng ta sẽ "xây nhà thủ công" từng bước một trên AWS Console.

**Kiến thức cơ bản:**
*   **VPC**: Hãy coi nó là "Ngôi nhà" của bạn trên mây. Tường rào bao quanh, không ai vào được nếu không mời.
*   **Subnet**: Các "Phòng" trong nhà.
    *   **Public Subnet**: Phòng khách, mở cửa sổ (Internet vào được). Dùng đặt Load Balancer, Bastion.
    *   **Private Subnet**: Phòng ngủ, đóng kín cửa (Internet KHÔNG vào trực tiếp được). Dùng đặt Database, Server chạy code (cho an toàn).
*   **Internet Gateway (IGW)**: Cổng chính của nhà.
*   **NAT Gateway**: Một cái "cổng phụ 1 chiều" cho Phòng ngủ, giúp người trong phòng ngủ đi ra ngoài mua đồ (tải thư viện) nhưng người ngoài không chui vào phòng ngủ được.

---

## BƯỚC 1: Xây Nhà & Chia Phòng (VPC Networking)

Truy cập [VPC Dashboard](https://console.aws.amazon.com/vpc).
Chọn Region: **Singapore (ap-southeast-1)** (Góc trên cùng bên phải).

### 1.1. Tạo VPC
1.  Bấm nút cam **Create VPC**.
2.  Chọn **VPC and more** (Giao diện mới rất tiện, tạo 1 lần được hết).
3.  Điền:
    *   **Name tag**: `club-vpc`
    *   **IPv4 CIDR block**: `10.0.0.0/16` (Nhà có thể chứa 65,536 IP).
    *   **Number of Availability Zones (AZs)**: Chọn **3** (Xây nhà trên 3 khu đất khác nhau cho an toàn, lỡ 1 khu mất điện thì khu kia vẫn chạy).
    *   **Number of public subnets**: **3**.
    *   **Number of private subnets**: **3**.
    *   **NAT gateways**: Chọn **In 1 AZ** (Để tiết kiệm tiền, giá khoảng $30/tháng). Nếu giàu thì chọn "In all AZs".
    *   **VPC endpoints**: **None**.
4.  Bấm **Create VPC**. Đợi nó chạy xong (khoảng 2-3 phút).

✅ **Kết quả**: Bạn đã có VPC, 6 Subnet, Route Table, IGW và NAT Gateway được cấu hình tự động!

---

## BƯỚC 2: Thiết Lập An Ninh (Security Groups)

Truy cập menu bên trái: **Security -> Security Groups**. Chúng ta cần tạo 3 "ổ khóa".

### 2.1. Ổ khóa cho Load Balancer (Cổng công cộng)
1.  Bấm **Create security group**.
    *   Name: `club-alb-sg`
    *   Description: `Public access for Load Balancer`
    *   VPC: Chọn `club-vpc` vừa tạo.
2.  **Inbound rules** (Luật cho phép vào):
    *   Type: **HTTP** | Source: **Anywhere-IPv4** (`0.0.0.0/0`).
    *   Type: **HTTPS** | Source: **Anywhere-IPv4** (`0.0.0.0/0`).
3.  Bấm **Create security group**.

### 2.2. Ổ khóa cho Server (ECS Tasks)
1.  Bấm **Create security group**.
    *   Name: `club-ecs-tasks-sg`
    *   Description: `Only allow traffic from ALB`
    *   VPC: `club-vpc`
2.  **Inbound rules**:
    *   Type: **All TCP** | Port range: `3000 - 4000` (hoặc để mặc định 0-65535) | Source: Chọn **Custom**, gõ `club-alb-sg` (chọn cái vừa tạo ở trên).
    *   *Ý nghĩa: Chỉ có Load Balancer mới được gõ cửa Server.*
3.  Bấm **Create security group**.

### 2.3. Ổ khóa cho Database
1.  Bấm **Create security group**.
    *   Name: `club-db-sg`
    *   Description: `Access for DB`
    *   VPC: `club-vpc`
2.  **Inbound rules**:
    *   Type: **PostgreSQL** (5432) | Source: `club-ecs-tasks-sg`.
    *   Type: **All TCP** (cho Mongo 27017, Rabbit 5672) | Source: `club-ecs-tasks-sg`.
    *   *Thêm 1 dòng nữa cho Bastion nếu bạn cần SSH vào check DB (để sau).*

---

## BƯỚC 3: Tạo Load Balancer (Người điều phối)

Truy cập [EC2 Dashboard](https://console.aws.amazon.com/ec2) -> Menu trái: **Load Balancing** -> **Load Balancers**.

1.  Bấm **Create Load Balancer** -> Chọn **Application Load Balancer (ALB)**.
2.  **Basic config**:
    *   Name: `club-alb`
    *   Scheme: **Internet-facing** (Quan trọng!).
    *   IP address type: **IPv4**.
3.  **Network mapping**:
    *   VPC: `club-vpc`.
    *   Mappings: Tích chọn cả 3 AZ. Với mỗi AZ, **phải chọn Public Subnet** (tên thường có chữ `public`).
4.  **Security groups**: Xóa cái mặc định, chọn `club-alb-sg`.
5.  **Listeners and routing**:
    *   Port 80 (HTTP).
    *   Default action: Tạo một **Target Group** tạm thời (ví dụ tên `bg-temp`), tí nữa sửa sau.
6.  Bấm **Create load balancer**.

---

## BƯỚC 4: Tạo Cơ Sở Dữ Liệu (Database)

### 4.1. RDS (PostgreSQL)
Truy cập **RDS** -> **Create database**.
*   **Choose a database creation method**: Standard create.
*   **Engine**: PostgreSQL.
*   **Templates**: **Free tier** (Để đỡ tốn tiền).
*   **DB instance identifier**: `club-auth-db`.
*   **Master password**: Tự đặt (ví dụ `MatKhauAnToan123`).
*   **Connectivity**:
    *   VPC: `club-vpc`.
    *   Public access: **No** (Quan trọng!).
    *   VPC security group: Chọn `club-db-sg` (nhớ bỏ cái `default`).
*   Bấm **Create database**.

### 4.2. MongoDB và RabbitMQ
*   Do làm thủ công khá lâu, bạn có thể tái sử dụng **MongoDB Atlas** có sẵn.
*   RabbitMQ: Vào Amazon MQ -> Create broker -> Chọn RabbitMQ -> Chọn `Single-instance broker`. User/Pass: `guest` / `...`. Nhớ chọn VPC `club-vpc` và Private Subnet + Security Group `club-db-sg`.

---

## BƯỚC 5: Chạy Ứng Dụng (ECS Fargate)

Đây là phần phức tạp nhất. Làm từng service một (ví dụ Auth Service).

### 5.1. Tạo Target Group (Nhóm đích đến)
(EC2 -> Load Balancing -> Target Groups)
1.  **Create target group**.
2.  Type: **IP addresses** (Bắt buộc cho Fargate).
3.  Name: `tg-auth`. Protocol: HTTP. Port: `3001`.
4.  VPC: `club-vpc`.
5.  Health check path: `/` (Với Auth) hoặc `/health` (Với service khác).
6.  Next -> Không cần add IP ngay -> **Create**.

### 5.2. Tạo ECS Cluster (Cụm máy)
(Vào Elastic Container Service -> Clusters)
1.  **Create Cluster**.
2.  Name: `club-cluster`.
3.  Infrastructure: Chọn **AWS Fargate** (Serverless).
4.  **Create**.

### 5.3. Tạo Task Definition (Bản vẽ Container)
(Menu trái: Task definitions -> Create new family)
1.  Name: `auth-task`.
2.  Launch type: **AWS Fargate**.
3.  OS Architecture: Linux/X86_64.
4.  CPU: `.25 vCPU`. Memory: `.5 GB` (nhỏ nhất cho rẻ).
5.  **Container - 1**:
    *   Name: `auth-container`.
    *   Image URI: `public.ecr.aws/docker/library/httpd:latest` (Dùng tạm ảnh mẫu, sau này đổi thành ảnh ECR của bạn).
    *   Container port: `3001`.
    *   **Environment variables**: Ở đây bạn điền `DATABASE_URL`, `RABBITMQ_URL`, `NODE_ENV=production`...
6.  Bấm **Create**.

### 5.4. Tạo Service (Chạy Task)
(Vào Cluster `club-cluster` -> Tab Services -> Create)
1.  Compute options: **Launch type**. Chọn **FARGATE**.
2.  Task definition: `auth-task` (vừa tạo), Revision `latest`.
3.  Service name: `auth-service`.
4.  Desired tasks: `1`.
5.  **Networking**:
    *   VPC: `club-vpc`.
    *   Subnets: Chọn **3 Private Subnets**.
    *   Security group: Tạo mới hoặc chọn `club-ecs-tasks-sg`.
    *   Public IP: **OFF** (Vì nằm trong Private subnet).
6.  **Load balancing**:
    *   Load balancer type: **Application Load Balancer**.
    *   Load balancer: Chọn `club-alb`.
    *   Container to load balance: `auth-container:3001`.
    *   Target group: Chọn `tg-auth`.
7.  Bấm **Create**.

### 5.5. Cấu hình Routing (Luật chuyển hướng)
Quay lại **EC2 -> Load Balancers** -> Chọn `club-alb` -> Tab **Listeners and rules**.
1.  Chọn Listener Port 80 -> **Manage rules**.
2.  Bấm dấu `+` (Add rule) -> Insert Rule.
3.  **Conditions**: Add condition -> **Path** -> `/api/auth*`.
4.  **Actions**: Forward to -> `tg-auth`.
5.  Save.

---

**Lặp lại bước 5.1 -> 5.5 cho tất cả các service còn lại (Club, Event, Notify, Image).**
Chỉ thay tên, Port (3002, 3003...), và Path Routing (`/api/clubs*`...).
