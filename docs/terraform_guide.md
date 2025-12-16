# Hướng Dẫn Sử Dụng Terraform cho Người Mới Bắt Đầu

Chào bạn! Đừng lo lắng nếu bạn chưa từng dùng Terraform. Hãy tưởng tượng Terraform giống như một "bản vẽ kiến trúc" cho ngôi nhà của bạn (AWS). Thay vì bạn phải tự tay xây từng viên gạch (bấm chuột trên AWS Console), bạn chỉ cần đưa bản vẽ này cho "robot" Terraform và nó sẽ tự xây mọi thứ y hệt như bản vẽ.

## 1. Chuẩn Bị Công Cụ (Prerequisites)

Trước khi bắt đầu, bạn cần cài đặt 2 công cụ quan trọng trên máy tính của mình:

1.  **Terraform CLI**: "Robot" xây dựng.
    *   **Mac (Homebrew):** Chạy lệnh `brew tap hashicorp/tap && brew install hashicorp/tap/terraform`
    *   **Windows/Linux:** Tải tại [terraform.io](https://developer.hashicorp.com/terraform/downloads)

2.  **AWS CLI**: Chìa khóa để Terraform vào được tài khoản AWS của bạn.
    *   Tải và cài đặt [AWS CLI](https://aws.amazon.com/cli/).
    *   Sau khi cài xong, mở Terminal và đăng nhập:
        ```bash
        aws configure
        ```
        *   Nó sẽ hỏi `AWS Access Key ID` và `Secret Access Key` (Bạn lấy trong AWS Console -> Security Credentials).
        *   Default region name: `ap-southeast-1` (Singapore - giống trong file cấu hình).
        *   Default output format: `json`.

## 2. Quy Trình "Xây Nhà" (Deployment)

Đây là 3 bước thần thánh mà bạn sẽ luôn thực hiện.

### Bước 1: Khởi động (Init)
Hãy vào thư mục chứa code Terraform:
```bash
cd terraform
```
Chạy lệnh khởi tạo. Lệnh này giống như việc robot đi mua dụng cụ cần thiết (tải các plugin AWS):
```bash
terraform init
```
> ✅ **Thành công khi:** Bạn thấy dòng chữ màu xanh lá cây `Terraform has been successfully initialized!`.

### Bước 2: Xem trước bản thiết kế (Plan)
Trước khi xây thật, hãy yêu cầu robot cho bạn xem nó "định" làm gì. Việc này giúp bạn tránh sai sót (hoặc tốn tiền oan).
Bạn phải cung cấp mật khẩu cho Database vì chúng ta không lưu nó trong code (bảo mật):
```bash
terraform plan -var="db_password=MatKhauCucManh123" -var="mq_password=MatKhauRabbit123"
```
> ℹ️ **Kết quả:** Nó sẽ liệt kê một danh sách dài các tài nguyên sẽ được tạo (dấu `+`). Nhìn dòng cuối cùng: `Plan: 25 to add, 0 to change, 0 to destroy.` (Số lượng có thể khác tùy file config).

### Bước 3: Xây dựng thật (Apply)
Bây giờ là lúc bấm nút xây dựng.
```bash
terraform apply -var="db_password=MatKhauCucManh123" -var="mq_password=MatKhauRabbit123"
```
*   Nó sẽ hiện lại bản kế hoạch và hỏi bạn: `Do you want to perform these actions?`
*   Gõ `yes` và bấm Enter.
*   ⏳ **Chờ đợi:** Quá trình này có thể mất 10-20 phút (đặc biệt là Database RDS tốn khá nhiều thời gian).

> ✅ **Thành công khi:** Bạn thấy `Apply complete! Resources: 25 added, 0 changed, 0 destroyed.`
> **QUAN TRỌNG:** Cuối cùng nó sẽ in ra các thông tin màu xanh (`Outputs`). **Hãy copy và lưu lại** các thông tin này (Database Endpoint, Bastion IP, v.v...) để dùng cấu hình sau này.

## 3. Nếu muốn xóa tất cả (Destroy)
Nếu bạn chỉ đang thử nghiệm và không muốn tốn tiền AWS nữa, hãy ra lệnh phá hủy ngôi nhà:
```bash
terraform destroy -var="db_password=MatKhauCucManh123" -var="mq_password=MatKhauRabbit123"
```
*   Gõ `yes` để xác nhận. Toàn bộ hạ tầng sẽ bị xóa sạch.

---

## Tóm tắt file dự án của bạn
Bạn có thể mở các file trong thư mục `terraform/` để xem:
*   `main.tf`: Khai báo "nhà cung cấp" là AWS.
*   `vpc.tf`: Tạo mạng lưới (đường xá).
*   `database.tf`: Tạo Database (kho chứa dữ liệu).
*   `services.tf`: Tạo App Runner (nơi chạy code).
*   `variables.tf`: Định nghĩa các biến số (như region, password).
