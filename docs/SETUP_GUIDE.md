# HƯỚNG DẪN TRIỂN KHAI — CAB BOOKING SYSTEM
_Dành cho thành viên clone từ GitHub | Cập nhật: 2026-04-19_

---

## MỤC LỤC
1. [Yêu cầu môi trường](#1-yêu-cầu-môi-trường)
2. [Clone dự án từ GitHub](#2-clone-dự-án-từ-github)
3. [Chạy với Docker Compose](#3-chạy-với-docker-compose)
4. [Port map các service](#4-port-map-các-service)
5. [Kiểm tra hệ thống](#5-kiểm-tra-hệ-thống)
6. [Monitoring & Observability](#6-monitoring--observability)
7. [Triển khai Kubernetes (tùy chọn)](#7-triển-khai-kubernetes-tùy-chọn)
8. [Xử lý lỗi thường gặp](#8-xử-lý-lỗi-thường-gặp)
9. [Reset hoàn toàn](#9-reset-hoàn-toàn)

---

## 1. YÊU CẦU MÔI TRƯỜNG

| Phần mềm | Phiên bản tối thiểu | Kiểm tra |
|----------|---------------------|----------|
| **Docker Desktop** | 4.x trở lên | `docker --version` |
| **Docker Compose** | v2 (tích hợp Docker Desktop) | `docker compose version` |
| **Git** | bất kỳ | `git --version` |
| **Node.js** *(tùy chọn)* | 18.x | `node --version` — chỉ cần nếu chạy test Jest |
| **k6** *(tùy chọn)* | 0.50+ | `k6 version` — chỉ cần cho performance test |

> **Yêu cầu phần cứng tối thiểu:**
> - RAM: **8 GB** (10 services + Kafka + DBs)
> - Disk: **5 GB** trống cho Docker images
> - CPU: 4 cores (Kafka + ZooKeeper rất ngốn CPU lúc khởi động)

> **Lưu ý OS:**
> - **Windows**: dùng PowerShell hoặc Git Bash
> - **macOS/Linux**: dùng Terminal
> - Tất cả lệnh trong guide này dùng cú pháp bash (dùng được trong Git Bash trên Windows)

---

## 2. CLONE DỰ ÁN TỪ GITHUB

### Bước 1 — Clone repo
```bash
git clone https://github.com/<your-org>/CAB-BOOKING-SYSTEM.git
cd CAB-BOOKING-SYSTEM
```

### Bước 2 — Kiểm tra cấu trúc thư mục
```
CAB-BOOKING-SYSTEM/
├── api-gateway/          # API Gateway (port 3000)
├── services/
│   ├── auth-service/     # Xác thực & JWT (port 3001)
│   ├── user-service/     # Quản lý user (port 3002)
│   ├── driver-service/   # Quản lý driver (port 3003)
│   ├── booking-service/  # Đặt xe (port 3004)
│   ├── ride-service/     # Hành trình + AI matching (port 3005)
│   ├── payment-service/  # Thanh toán (port 3006)
│   ├── pricing-service/  # Tính giá + Surge (port 3007)
│   ├── notification-service/ # Thông báo (port 3008)
│   └── review-service/   # Đánh giá (port 3009)
├── client/               # Frontend Next.js (port 3010)
├── infra/
│   ├── k8s/              # Kubernetes manifests
│   ├── k6/               # Load test scripts
│   ├── prometheus/       # Alert rules
│   └── grafana/          # Dashboard provisioning
├── docker-compose.yml    # File chính để chạy toàn bộ hệ thống
└── docs/                 # Tài liệu
```

### Bước 3 — Không cần tạo file `.env`
Tất cả biến môi trường đã được cấu hình sẵn trong `docker-compose.yml`. Không cần tạo file `.env` bổ sung.

---

## 3. CHẠY VỚI DOCKER COMPOSE

### Lần đầu tiên (build image)
```bash
# Chạy lần đầu: build tất cả image và khởi động
docker compose up --build -d
```
> Lần đầu mất khoảng **5–15 phút** tùy tốc độ internet (download base images).

### Các lần sau (image đã build)
```bash
docker compose up -d
```

### Theo dõi quá trình khởi động
```bash
# Xem log tất cả service
docker compose logs -f

# Xem log service cụ thể
docker compose logs -f booking-service
docker compose logs -f api-gateway
docker compose logs -f ride-service
```

> **Thứ tự khởi động mong đợi:**
> 1. PostgreSQL, MongoDB, Redis khởi động (~10s)
> 2. ZooKeeper → Kafka khởi động (~30s)
> 3. Các microservices khởi động (~20s)
> 4. API Gateway → Client (Next.js) khởi động sau cùng (~30s)
>
> **Tổng cộng: chờ ~90 giây** sau khi chạy `docker compose up` trước khi test.

### Kiểm tra tất cả container đang chạy
```bash
docker compose ps
```
Tất cả service phải ở trạng thái `running` (không phải `exited`).

---

## 4. PORT MAP CÁC SERVICE

| Service | Port | URL | Ghi chú |
|---------|------|-----|---------|
| **api-gateway** | 3000 | http://localhost:3000 | **Entry point chính** — test qua đây |
| auth-service | 3001 | http://localhost:3001 | Nội bộ |
| user-service | 3002 | http://localhost:3002 | Nội bộ |
| driver-service | 3003 | http://localhost:3003 | Nội bộ |
| booking-service | 3004 | http://localhost:3004 | Nội bộ |
| ride-service | 3005 | http://localhost:3005 | Nội bộ |
| payment-service | 3006 | http://localhost:3006 | Nội bộ |
| pricing-service | 3007 | http://localhost:3007 | Nội bộ |
| notification-service | 3008 | http://localhost:3008 | Nội bộ |
| review-service | 3009 | http://localhost:3009 | Nội bộ |
| **Frontend** | 3010 | http://localhost:3010 | Next.js UI |
| **Grafana** | 3011 | http://localhost:3011 | Monitoring dashboard |
| **Prometheus** | 9090 | http://localhost:9090 | Metrics |
| **Jaeger** | 16686 | http://localhost:16686 | Distributed tracing |
| Kafka Exporter | 9308 | http://localhost:9308/metrics | Kafka metrics |

> **Quan trọng:** Tất cả API request khi test **phải đi qua port 3000** (API Gateway).  
> Chỉ test trực tiếp service port (3001–3009) khi muốn bypass gateway.

---

## 5. KIỂM TRA HỆ THỐNG

### Health check tất cả service
```bash
# Bash / Git Bash / macOS Terminal
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "FAIL"
done
```

```powershell
# PowerShell
@(3000,3001,3002,3003,3004,3005,3006,3007,3008,3009) | ForEach-Object {
  try {
    $r = Invoke-RestMethod "http://localhost:$_/health"
    Write-Host "Port $_: $($r.status)"
  } catch {
    Write-Host "Port $_: FAIL"
  }
}
```

Kết quả mong đợi mỗi service:
```json
{ "status": "ok", "service": "auth-service", "timestamp": "..." }
```

### Kiểm tra Frontend
Mở trình duyệt và truy cập: http://localhost:3010

### Các URL Frontend quan trọng
| Trang | URL |
|-------|-----|
| Đăng ký | http://localhost:3010/auth/register |
| Đăng nhập | http://localhost:3010/auth/login |
| Customer Dashboard | http://localhost:3010/customer |
| Đặt xe | http://localhost:3010/customer/booking |
| Tracking | http://localhost:3010/customer/tracking |
| Driver Dashboard | http://localhost:3010/driver |
| Admin Dashboard | http://localhost:3010/admin |

---

## 6. MONITORING & OBSERVABILITY

### Grafana Dashboard
- URL: http://localhost:3011
- Login: `admin` / `admin123`
- Dashboard được tự động provisioning khi khởi động

### Prometheus
- URL: http://localhost:9090
- Metrics endpoint mỗi service: `http://localhost:<port>/metrics`
- Ví dụ: http://localhost:3004/metrics

### Jaeger Distributed Tracing
- URL: http://localhost:16686
- Service: chọn `booking-service`, `ride-service`, v.v.
- Trace toàn bộ flow: booking → pricing → ride → notification

### Kafka Monitoring
```bash
# Xem Kafka topics
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Xem consumer group lag
docker compose exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --all-groups
```

---

## 7. TRIỂN KHAI KUBERNETES (TÙY CHỌN)

> **Yêu cầu:** Đã có Kubernetes cluster (minikube, k3s, hoặc VirtualBox Swarm)

### Cài đặt với minikube
```bash
# Khởi động minikube
minikube start --memory=8192 --cpus=4

# Triển khai tất cả services
kubectl apply -f infra/k8s/

# Xem pod đang chạy
kubectl get pods -n cab-system

# Xem services
kubectl get services -n cab-system
```

### Docker Swarm (dùng VirtualBox)
```bash
# Khởi tạo swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml cab-stack

# Xem services
docker stack services cab-stack
```

### Rollback khi lỗi (Kubernetes)
```bash
# Xem lịch sử deployment
kubectl rollout history deployment/booking-service -n cab-system

# Rollback về phiên bản trước
kubectl rollout undo deployment/booking-service -n cab-system
```

---

## 8. XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: Port đã bị chiếm
```
Error: bind: address already in use
```
```bash
# Windows PowerShell — tìm process trên port (ví dụ 3000)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Lỗi: Service thoát ngay sau khi start (exit code 1)
```bash
# Xem log service bị lỗi
docker compose logs booking-service --tail=50

# Thường do DB chưa sẵn sàng → chờ 30s và restart
docker compose restart booking-service
```

### Lỗi: Kafka không connect (ECONNREFUSED kafka:9092)
```bash
# Kafka cần 30–60s để ready
# Restart các service cần Kafka
docker compose restart booking-service ride-service payment-service notification-service
```

### Lỗi: Database không tồn tại
```bash
# Reset volume và khởi động lại
docker compose down -v
docker compose up --build -d
```

### Lỗi: Docker hết RAM (OOMKilled)
- Docker Desktop → Settings → Resources → Memory: tăng lên **8 GB**
- Apply & Restart

### Lỗi: Build npm install failed
```bash
docker compose build --no-cache
docker compose up -d
```

### Lỗi: Frontend blank page
```bash
docker compose logs client --tail=30
# Chờ Next.js build xong (~2 phút lần đầu)
```

---

## 9. RESET HOÀN TOÀN

```bash
# Dừng tất cả, xóa container + volume + orphan
docker compose down -v --remove-orphans

# (Tùy chọn) Xóa image cũ để giải phóng disk
docker image prune -f

# Build lại từ đầu
docker compose up --build -d

# Chờ 90 giây để Kafka + DB khởi động đầy đủ
# Sau đó kiểm tra
curl http://localhost:3001/health
```

---

## DỪNG PROJECT

```bash
# Dừng (giữ data)
docker compose down

# Dừng và xóa toàn bộ data
docker compose down -v
```

> **Cảnh báo:** `down -v` xóa tất cả database data.

---

## TỔNG HỢP LỆNH NHANH

```bash
# Clone và chạy
git clone <repo-url> && cd CAB-BOOKING-SYSTEM
docker compose up --build -d

# Xem trạng thái
docker compose ps

# Health check nhanh
curl http://localhost:3000/health

# Reset
docker compose down -v && docker compose up --build -d
```
