# Lộ Trình Học Tập: Terraform & AWS (Dự án Club Management)

Tài liệu này được thiết kế dựa trên chính file code bạn đang có, chia thành 4 giai đoạn học tập.

## Giai đoạn 1: Nền tảng Terraform (IaC)
Hiểu "ngôn ngữ" dùng để xây dựng hệ thống này.

*   **Chủ đề 1: HCL & Terraform Basics**
    *   *Mục tiêu:* Hiểu cấu trúc file `.tf`.
    *   *Thực hành trên code của bạn:* Mở [main.tf](file:///Users/quockhanh/Documents/Code/club-management-system/terraform/main.tf). Tập trung vào khối `provider "aws"`. Tại sao phải dùng biến cho `region`?
    *   *Kiến thức cần nắm:* `resource`, `variable`, `output`, `data source`.
*   **Chủ đề 2: State & Lifecycle**
    *   *Mục tiêu:* Biết chuyện gì xảy ra khi gõ `terraform apply`.
    *   *Kiến thức cần nắm:* File `terraform.tfstate` là gì? Tại sao không được xóa nó manual? Tầm quan trọng của `terraform plan`.

## Giai đoạn 2: Cloud Networking (Mạng máy tính)
Học cách các thành phần "vẽ đường" gặp nhau.

*   **Chủ đề 3: VPC & Subnets**
    *   *Thực hành trên code của bạn:* Xem [vpc.tf](file:///Users/quockhanh/Documents/Code/club-management-system/terraform/vpc.tf). Tại sao lại có 3 `private_subnets` và 3 `public_subnets`? 
    *   *Kiến thức cần nắm:* CIDR block (ví dụ `10.0.0.0/16`), Public vs Private Subnet, Availability Zones (AZ).
*   **Chủ đề 4: Security Groups & Connectivity**
    *   *Thực hành trên code của bạn:* Tìm khối `aws_security_group` "ecs_tasks_sg" trong [services.tf](file:///Users/quockhanh/Documents/Code/club-management-system/terraform/services.tf). Nó chỉ cho phép traffic từ "alb_sg" đi vào. Tại sao?
    *   *Kiến thức cần nắm:* Inbound/Outbound rules, NAT Gateway (giúp mạng Private đi ra ngoài), Internet Gateway.

## Giai đoạn 3: AWS Compute & Services (Services & App)
Học cách chạy code và lưu dữ liệu.

*   **Chủ đề 5: Docker & ECS (Elastic Container Service)**
    *   *Thực hành trên code của bạn:* Mở [frontend.tf](file:///Users/quockhanh/Documents/Code/club-management-system/terraform/frontend.tf). Xem `aws_ecs_task_definition`.
    *   *Kiến thức cần nắm:* Docker Image, ECR (nơi chứa image), Task Definition (bản thiết kế container), Service (đảm bảo container luôn chạy).
*   **Chủ đề 6: Databases & Messagings**
    *   *Thực hành trên code của bạn:* Xem [database.tf](file:///Users/quockhanh/Documents/Code/club-management-system/terraform/database.tf). 
    *   *Kiến thức cần nắm:* RDS (PostgreSQL), Amazon MQ (RabbitMQ). Cách ứng dụng kết nối tới DB qua `endpoint`.

## Giai đoạn 4: Deployment & Operations (Vận hành)
Cách đưa mọi thứ vào hoạt động thực tế.

*   **Chủ đề 7: Application Load Balancer (ALB)**
    *   *Thực hành trên code của bạn:* Tìm `aws_lb_listener_rule` trong [services.tf](file:///Users/quockhanh/Documents/Code/club-management-system/terraform/services.tf). Làm sao AWS biết khi nào gửi traffic tới `auth-service` hay `event-service`?
    *   *Kiến thức cần nắm:* Path-based routing, Health checks, Target groups.
*   **Chủ đề 8: Bastion Host & Security**
    *   *Thực hành trên code của bạn:* Xem [bastion.tf](file:///Users/quockhanh/Documents/Code/club-management-system/terraform/bastion.tf).
    *   *Kiến thức cần nắm:* SSH Tunneling (Kết nối an toàn vào Database Private từ máy nhà bạn).

---

> [!TIP]
> **Cách học hiệu quả nhất:** 
> Đừng học lý thuyết suông. Hãy thử đổi tên một Security Group trong code, chạy `terraform plan` để xem nó thông báo sẽ thay đổi/xóa cái gì, rồi quay lại sửa lại như cũ. 
