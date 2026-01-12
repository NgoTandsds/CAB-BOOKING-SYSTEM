# 🚕 CAB-BOOKING-SYSTEM
Hệ thống đặt xe taxi theo thời gian thực – Microservices & Event-Driven Architecture

---

## 1. Giới thiệu đề tài

**CAB-BOOKING-SYSTEM** là một hệ thống đặt xe taxi theo thời gian thực, được thiết kế theo kiến trúc **Microservices kết hợp Event-Driven**, mô phỏng mô hình hoạt động của các nền tảng gọi xe hiện đại (Uber/Grab).

Hệ thống hỗ trợ các chức năng cốt lõi:
- Đặt xe
- Ghép tài xế
- Theo dõi chuyến đi theo thời gian thực
- Thanh toán
- Đánh giá
- Quản trị & giám sát hệ thống

👉 Luồng nghiệp vụ chính:
> **Người dùng đặt xe → hệ thống ghép tài xế → theo dõi chuyến đi → thanh toán → kết thúc chuyến**

---

## 2. Mục tiêu hệ thống

- Thiết kế **kiến trúc Microservices rõ ràng, dễ mở rộng**
- Áp dụng **Event-Driven Architecture** cho các luồng bất đồng bộ
- Hỗ trợ **Real-time (WebSocket)** cho theo dõi chuyến đi
- Đảm bảo **bảo mật theo mô hình Zero Trust**
- Tích hợp **AI ở mức kiến trúc** (matching, ETA, surge pricing – mô phỏng)
- Phù hợp triển khai, demo và đánh giá trong đồ án môn học

---

## 3. Kiến trúc tổng thể

### 3.1 Tổng quan kiến trúc
- **Frontend**: React (Customer App, Driver App, Admin Dashboard)
- **API Gateway**: điều phối request, xác thực, routing
- **Microservices**: mỗi nghiệp vụ là một service độc lập
- **Message Broker**: RabbitMQ / Kafka (event-driven)
- **Database**:
  - PostgreSQL: dữ liệu nghiệp vụ chính
  - MongoDB: review, notification, log
  - Redis: cache, token, realtime data
- **Observability**: Prometheus, Grafana, ELK (minh hoạ)

---

## 4. Cấu trúc source code

cab-booking-system/
├─ README.md
├─ docs/ # Tài liệu kiến trúc & nghiệp vụ
├─ infra/ # Docker, observability
├─ libs/ # Thư viện dùng chung (auth, messaging)
├─ gateway/ # API Gateway
├─ services/ # Các microservices
│ ├─ auth-service
│ ├─ user-service
│ ├─ driver-service
│ ├─ booking-service
│ ├─ ride-service
│ ├─ pricing-service
│ ├─ payment-service
│ ├─ review-service
│ ├─ notification-service
│ ├─ eta-service
│ └─ ai-matching-service
├─ frontend/
│ ├─ customer-app
│ ├─ driver-app
│ └─ admin-dashboard
└─ docker-compose.yml


---

## 5. Mô tả các service chính

### 🔐 Auth Service
- Đăng ký / đăng nhập
- Phát hành JWT
- Refresh token (mô phỏng)
- Phân quyền người dùng

### 👤 User Service
- Quản lý thông tin khách hàng
- Hồ sơ người dùng

### 🚖 Driver Service
- Quản lý tài xế
- Trạng thái sẵn sàng
- Nhận chuyến đi

### 📦 Booking Service
- Tạo / huỷ booking
- Phát event `booking.created`
- Khởi tạo luồng đặt xe

### 🧠 AI Matching Service
- Ghép tài xế cho booking (mock AI)
- Có cơ chế fallback rule-based

### 🕒 ETA Service
- Trả ETA cho chuyến đi
- Cache kết quả (Redis)

### 🚦 Ride Service
- Tạo chuyến đi (ride)
- Cập nhật trạng thái chuyến đi
- Real-time GPS & trạng thái (WebSocket)

### 💰 Pricing Service
- Tính giá ước tính
- Surge pricing (mô phỏng)

### 💳 Payment Service
- Thanh toán chuyến đi (mock)
- Retry / idempotency (minh hoạ)

### ⭐ Review Service
- Đánh giá tài xế & chuyến đi
- Lưu trữ dạng document (MongoDB)

### 🔔 Notification Service
- Nhận event
- Gửi thông báo (log/demo)

---

## 6. Luồng Event-Driven (tóm tắt)

- `booking.created`
- `booking.matched`
- `ride.created`
- `ride.status.changed`
- `payment.success`
- `notification.sent`

👉 Các service giao tiếp **bất đồng bộ** thông qua Message Broker.

---

## 7. Frontend Applications

### Customer App
- Đăng nhập
- Đặt xe
- Theo dõi chuyến đi
- Thanh toán
- Xem lịch sử

### Driver App
- Bật / tắt sẵn sàng
- Nhận cuốc xe
- Gửi GPS
- Cập nhật trạng thái chuyến đi

### Admin Dashboard
- Theo dõi health các service
- Thống kê cơ bản
- Giám sát hệ thống

---

## 8. Bảo mật (Zero Trust)

- Mọi request qua Gateway đều cần xác thực
- JWT + phân quyền theo vai trò
- Không service nào tin service khác mặc định

---

## 9. Cách chạy hệ thống (Local)

### Yêu cầu
- Docker & Docker Compose

### Chạy toàn bộ hệ thống
```bash
docker compose up --build
