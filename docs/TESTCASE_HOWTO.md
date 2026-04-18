# HƯỚNG DẪN TEST CHI TIẾT — 121 TEST CASES
_Base URL: `http://localhost:3000` | Tool: Postman / curl / Docker logs / k6_
_Cập nhật: 2026-04-19_

---

## CHUẨN BỊ TRƯỚC KHI TEST

### 1. Khởi động hệ thống
```bash
docker compose up --build -d
# Chờ ~90 giây cho Kafka + DB ready
```

### 2. Cài đặt Postman
- Download: https://www.postman.com/downloads/
- Tạo Collection mới: `CAB-BOOKING-SYSTEM`
- Set biến môi trường trong Postman:
  - `BASE_URL` = `http://localhost:3000`
  - `TOKEN` = *(lấy từ login)*
  - `BOOKING_ID` = *(lấy từ create booking)*
  - `RIDE_ID` = *(lấy từ booking flow)*

### 3. Thứ tự test khuyến nghị
Test theo thứ tự: **TC 1 → 2 → 5 → 3 → 4** rồi mới đến các level khác.  
Lý do: nhiều TC phụ thuộc vào token từ login (TC 2) và booking_id từ create booking (TC 3).

### 4. Lưu biến môi trường trong Postman
Sau mỗi lần tạo resource, vào Tests tab của Postman và lưu:
```javascript
// Ví dụ: lưu token sau login
const res = pm.response.json();
pm.environment.set("TOKEN", res.accessToken);
pm.environment.set("USER_ID", res.user.id);
```

---

## TC 0 — ĐIỂM DANH

**Mục tiêu:** Chứng minh dự án chạy được.

1. Chạy `docker compose ps` → xem tất cả service status = `running`
2. Mở http://localhost:3010 → Frontend Next.js hiện ra
3. Chụp màn hình làm bằng chứng

---

## LEVEL 1 — BASIC API & FLOW

### TC 1 — Đăng ký user thành công

**Tool:** Postman  
**Method:** `POST`  
**URL:** `{{BASE_URL}}/auth/register`  
**Headers:** `Content-Type: application/json`  
**Body (raw JSON):**
```json
{
  "email": "user@test.com",
  "password": "123456",
  "name": "Test User"
}
```
**Expected:**
- Status: `201 Created`
- Body có `id` (user_id)
- Body có `email`, `name`

**Lưu vào biến:** `USER_EMAIL = user@test.com`, `USER_PASS = 123456`

---

### TC 2 — Đăng nhập trả JWT hợp lệ

**Tool:** Postman  
**Method:** `POST`  
**URL:** `{{BASE_URL}}/auth/login`  
**Body:**
```json
{
  "email": "user@test.com",
  "password": "123456"
}
```
**Expected:**
- Status: `200 OK`
- Body có `accessToken`

**Verify JWT:** Copy `accessToken` → paste vào https://jwt.io → phải thấy:
- `sub`: user_id
- `exp`: timestamp tương lai (Unix time)

**Lưu vào biến:** `TOKEN = <accessToken>`

---

### TC 3 — Tạo booking với input hợp lệ

**Yêu cầu:** Phải có ít nhất 1 driver online. Chạy TC 5 trước.

**Tool:** Postman  
**Method:** `POST`  
**URL:** `{{BASE_URL}}/bookings`  
**Headers:**
- `Authorization: Bearer {{TOKEN}}`
- `Content-Type: application/json`
- `Idempotency-Key: test-booking-001`

**Body:**
```json
{
  "pickupLat": 10.76,
  "pickupLng": 106.66,
  "dropLat": 10.77,
  "dropLng": 106.70,
  "vehicleType": "SEDAN"
}
```
**Expected:**
- Status: `200` hoặc `201`
- Body có `bookingId`, `status: "REQUESTED"`, `estimatedPrice > 0`

**Lưu:** `BOOKING_ID = <bookingId>`

---

### TC 4 — Lấy danh sách booking của user

**Method:** `GET`  
**URL:** `{{BASE_URL}}/bookings`  
**Headers:** `Authorization: Bearer {{TOKEN}}`

**Expected:**
- Status: `200`
- Body là mảng; mỗi item có `id`, `status`

---

### TC 5 — Driver chuyển trạng thái ONLINE

**Yêu cầu:** Đăng ký tài khoản driver riêng và login lấy DRIVER_TOKEN.

**Bước 1:** Đăng ký driver
```json
POST {{BASE_URL}}/auth/register
{
  "email": "driver@test.com",
  "password": "123456",
  "name": "Test Driver",
  "role": "DRIVER"
}
```
Sau đó: `POST /auth/login` với driver credentials → lấy `DRIVER_TOKEN`.

**Bước 2:** Tạo driver profile
```
POST {{BASE_URL}}/drivers
Authorization: Bearer {{DRIVER_TOKEN}}

{
  "vehicleType": "SEDAN",
  "licensePlate": "ABC-123",
  "vehicleModel": "Toyota Vios"
}
```

**Bước 3:** Chuyển online
```
PUT {{BASE_URL}}/drivers/availability
Authorization: Bearer {{DRIVER_TOKEN}}

{ "isAvailable": true }
```
**Expected:** Status `200`, body có `isAvailable: true`

---

### TC 6 — Booking tạo với status = REQUESTED

Sau TC 3, kiểm tra booking vừa tạo:  
**Method:** `GET`  
**URL:** `{{BASE_URL}}/bookings/{{BOOKING_ID}}`  
**Headers:** `Authorization: Bearer {{TOKEN}}`

**Expected:** `status: "REQUESTED"`, có `createdAt`

---

### TC 7 — ETA API trả giá trị > 0

**Chờ 5 giây** sau khi tạo booking để ride-service xử lý Kafka event.

**Method:** `GET`  
**URL:** `{{BASE_URL}}/rides/{{RIDE_ID}}/eta`  
**Headers:** `Authorization: Bearer {{TOKEN}}`

*(Lấy RIDE_ID bằng: `GET {{BASE_URL}}/rides` → lấy id của ride mới nhất)*

**Expected:** Body có `etaMinutes > 0` và `etaMinutes < 60`

---

### TC 8 — Pricing API trả giá hợp lệ

**Method:** `POST`  
**URL:** `{{BASE_URL}}/pricing/calculate`  
**Headers:** `Authorization: Bearer {{TOKEN}}`  
**Body:**
```json
{
  "pickupLat": 10.76,
  "pickupLng": 106.66,
  "dropLat": 10.77,
  "dropLng": 106.70,
  "vehicleType": "SEDAN"
}
```
**Expected:** `totalPrice > 0`, `surgeMultiplier >= 1`, `distanceKm > 0`

---

### TC 9 — Notification gửi thành công

**Bước 1:** Tạo booking như TC 3.  
**Bước 2:** Chờ 5 giây.  
**Bước 3:**
```
GET {{BASE_URL}}/notifications
Authorization: Bearer {{TOKEN}}
```
**Expected:** Mảng có ít nhất 1 notification với `type` liên quan đến booking.

**Hoặc:** Xem Docker log
```bash
docker compose logs notification-service --tail=20
```
Phải thấy log "Notification created" hoặc "handleRideCreated".

---

### TC 10 — GET /health tất cả service

**Bash:**
```bash
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009; do
  echo -n "Service :$port → "
  curl -s http://localhost:$port/health | python3 -m json.tool
done
```

**Postman:** Tạo 9 request riêng GET `http://localhost:3001/health` → `3009/health`

**Expected mỗi service:** `{ "status": "ok" }`

---

## LEVEL 2 — VALIDATION & EDGE CASES

### TC 11 — Booking thiếu pickup → HTTP 400

**Method:** `POST`  
**URL:** `{{BASE_URL}}/bookings`  
**Headers:** `Authorization: Bearer {{TOKEN}}`, `Idempotency-Key: test-tc11`  
**Body (thiếu pickup):**
```json
{
  "dropLat": 10.77,
  "dropLng": 106.70,
  "vehicleType": "SEDAN"
}
```
**Expected:** Status `400 Bad Request`, message đề cập đến `pickup` field.

---

### TC 12 — Sai format lat/lng → HTTP 422

**Body:**
```json
{
  "pickupLat": "abc",
  "pickupLng": 106.66,
  "dropLat": 10.77,
  "dropLng": 106.70,
  "vehicleType": "SEDAN"
}
```
**Expected:** Status `422 Unprocessable Entity`, validation error message.

---

### TC 13 — Driver offline → không nhận booking

**Bước 1:** Set driver offline
```
PUT {{BASE_URL}}/drivers/availability
Authorization: Bearer {{DRIVER_TOKEN}}

{ "isAvailable": false }
```
**Bước 2:** Tạo booking (TC 3 format). Chờ 10 giây.  
**Bước 3:** `GET /rides/{{RIDE_ID}}` → Expected: `status: "MATCHING"` (không có driver nào được assign).

---

### TC 14 — Payment method invalid → HTTP 400

**Method:** `POST`  
**URL:** `{{BASE_URL}}/payments`  
**Headers:** `Authorization: Bearer {{TOKEN}}`  
**Body:**
```json
{
  "rideId": "{{RIDE_ID}}",
  "amount": 50000,
  "paymentMethod": "invalid_card"
}
```
**Expected:** Status `400`, message về invalid payment method.

---

### TC 15 — ETA với distance = 0 (pickup = drop)

**Method:** `POST`  
**URL:** `{{BASE_URL}}/pricing/calculate`  
**Body:**
```json
{
  "pickupLat": 10.76,
  "pickupLng": 106.66,
  "dropLat": 10.76,
  "dropLng": 106.66,
  "vehicleType": "SEDAN"
}
```
**Expected:** Không crash (Status `200`); `totalPrice >= 0`; hệ thống không trả giá trị âm.

---

### TC 16 — Pricing demand_index = 0 → surge ≥ 1

**Method:** `POST`  
**URL:** `{{BASE_URL}}/pricing/surge`  
**Body:**
```json
{
  "area": "downtown",
  "demandIndex": 0,
  "supplyIndex": 1
}
```
**Expected:** `surgeMultiplier >= 1.0` (không bao giờ < 1), không crash, giá hợp lệ.

---

### TC 17 — Fraud API thiếu field → HTTP 400

> **❌ FAIL — Hệ thống không có Fraud Detection Service.**
> Chứng minh bằng cách gọi: `GET {{BASE_URL}}/fraud/score` → `404 Not Found`.

---

### TC 18 — Token expired → HTTP 401

**Cách 1 — Dùng token giả đã expire:**
Tạo token expire trong quá khứ tại https://jwt.io với `exp` = một timestamp cũ.

**Cách 2 — Thủ công:**
```
GET {{BASE_URL}}/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.SIGNATURE
```
**Expected:** `401 Unauthorized`, message `Token expired`.

---

### TC 19 — Duplicate booking (idempotency)

**Lần 1:** Tạo booking với `Idempotency-Key: unique-key-tc19` → Status 201, `idempotent: false`  
**Lần 2:** Gửi **cùng request** với **cùng Idempotency-Key** → Status 200, body có `idempotent: true`

Kiểm tra DB: chỉ có 1 booking mới (không duplicate).

---

### TC 20 — Payload quá lớn → HTTP 413

**Tạo JSON body lớn (>100kb) bằng Postman Pre-request Script:**
```javascript
// Pre-request Script trong Postman
const bigStr = "x".repeat(200000);  // 200kb
pm.request.body.raw = JSON.stringify({ data: bigStr });
```

**Method:** `POST`  
**URL:** `{{BASE_URL}}/bookings`  
**Headers:** `Authorization: Bearer {{TOKEN}}`

**Expected:** Status `413 Payload Too Large`.

---

## LEVEL 3 — INTEGRATION TEST

### TC 21 — Booking → gọi ETA service thành công

1. Tạo booking (TC 3)
2. Kiểm tra response có `estimatedPrice > 0` *(pricing service được gọi)*
3. Chờ 5s, `GET /rides/{{RIDE_ID}}/eta` → `etaMinutes > 0` *(eta service được gọi)*

---

### TC 22 — Booking → gọi Pricing service

1. Tạo booking (TC 3)
2. Response phải có `estimatedPrice > 0`
3. Xem log: `docker compose logs booking-service --tail=20` → thấy "pricingBreaker" hoặc "pricing called"

---

### TC 23 — AI Agent chọn driver từ Driver Service

1. Set driver online (TC 5) + update location:
```
PUT {{BASE_URL}}/drivers/location
Authorization: Bearer {{DRIVER_TOKEN}}

{ "lat": 10.76, "lng": 106.66 }
```
2. Tạo booking (TC 3)
3. Chờ 10 giây
4. `docker compose logs ride-service --tail=30` → thấy `bestMatch`, `scoreDriver`, `Selected driver`

---

### TC 24 — Booking → Payment → Notification flow (End-to-End)

1. Set driver online + location
2. Tạo booking → chờ match → lấy `RIDE_ID`
3. `PUT {{BASE_URL}}/rides/{{RIDE_ID}}/start` với DRIVER_TOKEN
4. `PUT {{BASE_URL}}/rides/{{RIDE_ID}}/complete` với DRIVER_TOKEN
5. Chờ 5s → `GET {{BASE_URL}}/payments?rideId={{RIDE_ID}}` → payment tạo tự động
6. `GET {{BASE_URL}}/notifications` với TOKEN → có notification

---

### TC 25 — Kafka event ride_requested published

1. Tạo booking
2. `docker compose logs ride-service --tail=20` → thấy log `handleRideCreated` hoặc `ride.created consumed`
3. Hoặc dùng Kafka UI (nếu có): topic `ride.events` → thấy event `type: "ride.created"`

**Xem Kafka events:**
```bash
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic ride.events \
  --from-beginning \
  --max-messages 5
```

---

### TC 26 — Driver nhận notification

1. Tạo booking + driver online + driver được assign
2. `GET {{BASE_URL}}/notifications` với DRIVER_TOKEN → có notification `type: "ride.assigned"`
3. Log: `docker compose logs notification-service --tail=20`

---

### TC 27 — Booking update trạng thái ACCEPTED/ASSIGNED

1. Driver online + location
2. Tạo booking → chờ 10s
3. `GET {{BASE_URL}}/rides/{{RIDE_ID}}`
4. **Expected:** `status: "ASSIGNED"` (từ MATCHING)
5. Xem log ride-service → thấy transition log

---

### TC 28 — MCP context được fetch thành công

1. Tạo booking (TC 3)
2. `docker compose logs ride-service --tail=30` → thấy:
   - Gọi driver service (nearby drivers)
   - Tính ETA
   - Tính score từng driver
   - Quyết định bestMatch

---

### TC 29 — API Gateway route đúng service

Test routing:
```bash
# Gateway route /bookings → booking-service
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer {{TOKEN}}" \
  http://localhost:3000/bookings
# Expected: 200

# Không route /nonexistent
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/nonexistent
# Expected: 404
```

---

### TC 30 — Retry khi Pricing service timeout

1. Tắt pricing service: `docker compose stop pricing-service`
2. Tạo booking → booking vẫn được tạo (với estimatedPrice = 0, circuit breaker fallback)
3. Bật lại: `docker compose start pricing-service`
4. Tạo booking lần 2 → `estimatedPrice > 0` (pricing service hoạt động lại)

---

## LEVEL 4 — TRANSACTION

### TC 31 — Transaction tạo booking thành công

1. Tạo booking (TC 3)
2. `GET /bookings/{{BOOKING_ID}}` → `status: "REQUESTED"`, có `createdAt`, có `id`
3. Log: `docker compose logs booking-service --tail=10` → "Transaction committed"

---

### TC 32 — Rollback khi lỗi giữa chừng

1. Tắt Postgres tạm thời sau khi booking đang xử lý:
```bash
docker compose stop postgres-booking
# Ngay lập tức tạo booking
# Bật lại
docker compose start postgres-booking
```
2. Kiểm tra: `GET /bookings` → booking không được tạo (rollback)
3. Log: thấy "Transaction rolled back" hoặc error

---

### TC 33 — Payment thất bại → rollback booking

1. Complete ride (TC 24 bước 1-4)
2. Gọi payment với amount âm (để force fail):
```
POST {{BASE_URL}}/payments
{ "rideId": "{{RIDE_ID}}", "amount": -1, "paymentMethod": "cash" }
```
3. `GET /rides/{{RIDE_ID}}` → `status: "FAILED"` hoặc `"CANCELLED"`
4. Log notification-service → thấy `payment.failed` notification

---

### TC 34 — Idempotent transaction (không double charge)

1. POST /payments lần 1 → ghi nhớ response
2. POST /payments **cùng rideId** lần 2 → `idempotent: true`, không tạo payment mới
3. Verify: `GET /payments?rideId={{RIDE_ID}}` → chỉ 1 payment record

---

### TC 35 — Concurrent booking (race condition)

Dùng Postman Runner hoặc curl song song:
```bash
# Chạy 2 request cùng lúc
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: race-1" \
  -H "Content-Type: application/json" \
  -d '{"pickupLat":10.76,"pickupLng":106.66,"dropLat":10.77,"dropLng":106.70,"vehicleType":"SEDAN"}' &

curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: race-2" \
  -H "Content-Type: application/json" \
  -d '{"pickupLat":10.76,"pickupLng":106.66,"dropLat":10.77,"dropLng":106.70,"vehicleType":"SEDAN"}' &
wait
```
**Expected:** Cả 2 booking tạo OK nhưng chỉ 1 driver được assign (lock mechanism).

---

### TC 36 — Saga transaction success flow

Thực hiện full flow:
1. Register + Login (customer + driver)
2. Driver: online + location
3. Customer: tạo booking → chờ ASSIGNED
4. Driver: `PUT /rides/{{RIDE_ID}}/start` → IN_PROGRESS
5. Driver: `PUT /rides/{{RIDE_ID}}/complete` → COMPLETED
6. Chờ 5s → `GET /payments?rideId={{RIDE_ID}}` → payment SUCCESS
7. `GET /rides/{{RIDE_ID}}` → status PAID

---

### TC 37 — Saga failure + compensation

1. Complete ride → payment tạo tự động
2. Simulate payment fail (invalid method/amount)
3. `GET /rides/{{RIDE_ID}}` → CANCELLED
4. `GET /notifications` → thấy "payment failed" notification

---

### TC 38 — Kafka event consistency (outbox pattern)

1. Tắt Kafka: `docker compose stop kafka`
2. Tạo booking → log booking-service thấy "Buffered event"
3. Bật Kafka: `docker compose start kafka`, chờ 30s
4. `docker compose logs booking-service --tail=20` → thấy "Flushed buffered events"
5. Log ride-service → thấy `handleRideCreated` *(event không bị mất)*

---

### TC 39 — Partial failure (network issue)

1. Tắt payment-service: `docker compose stop payment-service`
2. Complete ride
3. Log ride-service → thấy retry attempts
4. Bật payment: `docker compose start payment-service`
5. Ride eventually PAID sau retry

---

### TC 40 — Data integrity (ACID)

**Atomic test:**
- Simulate payment fail → booking bị cancel → DB không có "dang dở" record

**Consistent test:**
```
POST {{BASE_URL}}/bookings body thiếu field bắt buộc
```
→ Không có record nào được insert

**Isolated test:**
- 2 booking requests song song → mỗi booking có state độc lập

**Durable test:**
```bash
docker compose restart booking-service
GET {{BASE_URL}}/bookings  # Data vẫn còn
```

---

## LEVEL 5 — AI SERVICE VALIDATION

### TC 41 — ETA model output trong range hợp lý

```
GET {{BASE_URL}}/rides/{{RIDE_ID}}/eta
Authorization: Bearer {{TOKEN}}
```
**Expected:** `0 < etaMinutes < 60`

---

### TC 42 — Pricing surge > 1 khi demand cao

```
POST {{BASE_URL}}/pricing/surge
Authorization: Bearer {{TOKEN}}

{ "area": "downtown", "demandIndex": 2, "supplyIndex": 1 }
```
**Expected:** `surgeMultiplier > 1.0` và `surgeMultiplier <= 3.0`

---

### TC 43 — Fraud score > threshold → flagged

> **❌ FAIL** — Không có Fraud Service. Chứng minh bằng `GET /fraud/*` → 404.

---

### TC 44 — Recommendation trả top-3 drivers

1. Tạo 3+ drivers online với locations khác nhau
2. Tạo booking
3. `docker compose logs ride-service --tail=30` → thấy danh sách scored drivers (top 3 nhất)

---

### TC 45 — Forecast trả đúng format

> **❌ FAIL** — Không có Forecast Service.

---

### TC 46 — Model version được trả về đúng

```
GET {{BASE_URL}}/pricing/surge
Authorization: Bearer {{TOKEN}}
```
**Expected:** Response có `algorithm` hoặc `version` field.

```
GET {{BASE_URL}}/rides/{{RIDE_ID}}/eta
```
**Expected:** Response có `algorithm: "linear"` hoặc tương tự.

---

### TC 47 — AI latency < 200ms

Trong Postman, xem **Response Time** (góc dưới phải) sau khi gọi:
- `POST /pricing/calculate` → < 200ms
- `GET /rides/{{RIDE_ID}}/eta` → < 200ms

---

### TC 48 — Drift detection trigger

> **❌ FAIL** — Không có Drift Detection module.

---

### TC 49 — Model fallback khi lỗi

1. Dừng pricing-service: `docker compose stop pricing-service`
2. Tạo booking → vẫn thành công (fallback price = 0)
3. `docker compose logs booking-service --tail=10` → thấy "Circuit breaker fallback"
4. Bật lại pricing-service

---

### TC 50 — Input bất thường → model không crash

```
POST {{BASE_URL}}/pricing/calculate

{
  "pickupLat": 10.76,
  "pickupLng": 106.66,
  "dropLat": 21.03,
  "dropLng": 105.84,
  "vehicleType": "SEDAN"
}
```
*(Khoảng cách ~1000km Sài Gòn → Hà Nội)*

**Expected:** Status `200`, giá cao nhưng hợp lý; không crash; không trả NaN/Infinity.

---

## LEVEL 6 — AI AGENT LOGIC

### TC 51 — Agent chọn driver gần nhất

**Setup:** Tạo 3 drivers với vị trí khác nhau từ pickup point:
- Driver 1: cách 5km
- Driver 2: cách 2km  
- Driver 3: cách 3km

**Test:**
1. Tạo booking tại `pickupLat: 10.76, pickupLng: 106.66`
2. Chờ 10s
3. `docker compose logs ride-service --tail=40` → thấy Driver 2 được chọn (2km gần nhất)
4. `GET /rides/{{RIDE_ID}}` → `driverId` là Driver 2

---

### TC 52 — Agent chọn driver rating cao hơn

**Setup:**
- Driver 1: distance=2km, rating=4.0
- Driver 2: distance=3km, rating=4.9

**Test:**
1. Tạo booking
2. Xem log → agent có thể chọn Driver 2 (rating cao bù distance xa)
3. Log thấy score calculation: `distance*0.5 + rating*0.3 + acceptance*0.2`

---

### TC 53 — Agent cân bằng ETA vs price

**Verify qua code review:**
```bash
cat services/ride-service/src/modules/matching.js
```
Xem hàm `scoreDriver()`:
- `distanceScore = 1/distance * 0.5`
- `ratingScore = (rating/5) * 0.3`
- `acceptanceScore = acceptanceRate * 0.2`
- `total = distanceScore + ratingScore + acceptanceScore`

---

### TC 54 — Agent gọi đúng tool (ETA vs Pricing)

```bash
docker compose logs ride-service --tail=50
```
Phải thấy:
- `axios.get('/drivers/nearby')` — lấy driver list
- ETA calculation trong `eta.js`
- **Không gọi dư/sai thứ tự**

---

### TC 55 — Agent xử lý context thiếu dữ liệu (no drivers)

1. Set tất cả drivers offline
2. Tạo booking
3. Chờ 10s
4. `GET /rides/{{RIDE_ID}}` → `status: "MATCHING"` (không crash, không FAILED)
5. Log: `docker compose logs ride-service` → "No suitable driver found" hoặc `bestMatch = null`

---

### TC 56 — Agent retry khi service lỗi

1. Tắt driver-service: `docker compose stop driver-service`
2. Tạo booking
3. `docker compose logs ride-service --tail=40` → thấy retry logs:
   - "Attempt 1 failed, retrying..."
   - "Attempt 2 failed, retrying..."
   - Sau 4 lần: ride giữ MATCHING
4. Bật driver-service: `docker compose start driver-service`

---

### TC 57 — Agent không chọn driver offline

1. Có 2 drivers: Driver A (offline), Driver B (online)
2. Tạo booking
3. Xem log ride-service → chỉ Driver B trong danh sách scored
4. `GET /rides/{{RIDE_ID}}` → driverId = Driver B

---

### TC 58 — Agent log decision đầy đủ

```bash
docker compose logs ride-service --tail=50
```
Phải thấy:
- "Fetched X drivers"
- "Score for driver D1: 0.XXX"
- "Best match: driverAuthId=..."
- "Ride RIDE_ID assigned to driver..."

---

### TC 59 — Agent xử lý nhiều request song song (no race condition)

```bash
# Chạy 5 bookings cùng lúc trong bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/bookings \
    -H "Authorization: Bearer $TOKEN" \
    -H "Idempotency-Key: parallel-$i" \
    -H "Content-Type: application/json" \
    -d '{"pickupLat":10.76,"pickupLng":106.66,"dropLat":10.77,"dropLng":106.70,"vehicleType":"SEDAN"}' &
done
wait
```
**Expected:** Mỗi booking được assign driver khác nhau; không có 2 booking cùng driver; không conflict.

---

### TC 60 — Agent fallback rule-based khi AI fail

1. Tạm thời comment scoring function trong code (hoặc simulate throw)
2. Rebuild: `docker compose up --build -d ride-service`
3. Tạo booking với driver online
4. Log → thấy "Falling back to nearest driver" — `findNearestDriver()` được gọi
5. Ride vẫn được assign (không crash)

---

## LEVEL 7 — PERFORMANCE & LOAD TEST

> **Yêu cầu:** Cài k6 — https://k6.io/docs/getting-started/installation/

### TC 61 — 1000 req/s booking

```bash
k6 run infra/k6/booking-load.js
```
**Expected:** Error rate < 5%, success rate > 95%.

---

### TC 62 — ETA service under load

```bash
k6 run infra/k6/eta-load.js
```
**Expected:** P95 latency < 200ms.

---

### TC 63 — Pricing service under spike

```bash
k6 run infra/k6/pricing-spike.js
```
**Expected:** Không crash; giá hợp lệ; không trả giá sai.

---

### TC 64 — Kafka throughput test

```bash
k6 run infra/k6/kafka-throughput.js
```
**Expected:**
- Error rate < 5%
- P95 < 500ms
- Tổng messages > 1000

---

### TC 65 — DB connection pool exhaustion

```bash
# Tạo nhiều concurrent requests
k6 run --vus 50 --duration 30s infra/k6/booking-load.js
```
**Monitor:**
```bash
docker compose logs booking-service | grep -i "pool\|connection\|queue"
```
**Expected:** Không crash DB; requests được queue hoặc reject gracefully.

---

### TC 66 — Redis cache hit rate > 90%

```bash
# Gọi pricing/surge nhiều lần
for i in {1..20}; do
  curl -s "http://localhost:3007/pricing/surge?area=downtown" > /dev/null
done

# Kiểm tra Redis stats
docker compose exec redis redis-cli -a redis123 info stats | grep keyspace_hits
```
**Expected:** `keyspace_hits` tăng nhiều lần sau lần đầu (cache hit).

---

### TC 67 — API Gateway rate limit

```bash
# Gửi >200 request/phút đến api-gateway
for i in {1..250}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3000/bookings
done | sort | uniq -c
```
**Expected:** Nhiều response `429 Too Many Requests` sau khi vượt limit.

---

### TC 68 — P95 latency < 300ms

```bash
k6 run --out json=results.json infra/k6/booking-load.js
# Xem P95 trong output
```
**Hoặc xem Grafana:** http://localhost:3011 → Dashboard → P95 Latency panel.

---

### TC 69 — Load test giờ cao điểm

```bash
# Ramping load test
k6 run infra/k6/booking-load.js
```
*(Script đã cấu hình ramping VUs để mô phỏng giờ cao điểm)*

**Xem Grafana real-time** trong khi k6 chạy.

---

### TC 70 — Auto scaling (HPA) — Yêu cầu Kubernetes

**Yêu cầu:** Kubernetes cluster (minikube / VirtualBox Swarm)

```bash
# Deploy lên K8s
kubectl apply -f infra/k8s/

# Xem HPA
kubectl get hpa -n cab-system

# Generate load để trigger HPA
k6 run --vus 100 --duration 5m infra/k6/booking-load.js &

# Theo dõi scaling
kubectl get pods -n cab-system -w
```
**Expected:** Pod count tăng khi CPU > 60%; `kubectl describe hpa` thấy ScaleUp event.

**Docker Swarm (VirtualBox):**
```bash
docker swarm init
docker stack deploy -c docker-compose.yml cab-stack
docker service scale cab-stack_booking-service=3
```

---

## LEVEL 8 — FAILURE & RESILIENCE

### TC 71 — Driver service down → fallback

```bash
docker compose stop driver-service
```
Tạo booking (TC 3) → chờ 30s

`GET /rides/{{RIDE_ID}}` → **Expected:** `status: "MATCHING"` (không crash system)

```bash
docker compose start driver-service
```

---

### TC 72 — Pricing service timeout → retry

```bash
docker compose stop pricing-service
```
Tạo booking → **Expected:** Booking tạo thành công với `estimatedPrice: 0` (fallback)

Log: `docker compose logs booking-service --tail=15` → "Circuit breaker fallback"

```bash
docker compose start pricing-service
```

---

### TC 73 — Kafka down → buffer event

```bash
docker compose stop kafka
```
Tạo booking:
- Log booking-service → "Event buffered" hoặc "Kafka not available, buffering"

```bash
docker compose start kafka
# Chờ 30s cho Kafka ready
```
- Log booking-service → "Flushed X buffered events"
- Log ride-service → `handleRideCreated` (event không bị mất)

---

### TC 74 — DB failover

> **❌ FAIL** — Không có PostgreSQL HA. Chứng minh:
```bash
docker compose stop postgres-booking
GET {{BASE_URL}}/bookings  # → 500 / connection error
docker compose start postgres-booking
```
Không có auto-failover sang replica.

---

### TC 75 — Circuit breaker open

1. Tắt pricing-service
2. Gọi `POST /bookings` 5–6 lần → circuit breaker mở sau 50% failures (threshold 3 calls)
3. Log booking-service → "Circuit OPEN"
4. Các request tiếp theo → fallback ngay (không retry)

---

### TC 76 — Partial system failure

```bash
# Tắt một service không quan trọng
docker compose stop review-service

# Tạo booking (core function)
POST {{BASE_URL}}/bookings
```
**Expected:** Booking vẫn được tạo. `GET /health` cho booking-service vẫn trả OK.

---

### TC 77 — Retry exponential backoff

```bash
docker compose stop driver-service
# Tạo booking
docker compose logs ride-service --tail=40
```
**Expected:**
```
Attempt 1 failed, retrying in 500ms...
Attempt 2 failed, retrying in 1000ms...
Attempt 3 failed, retrying in 2000ms...
Attempt 4 failed, all retries exhausted
```

---

### TC 78 — Service mesh routing fail → 502

```bash
docker compose stop booking-service
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickupLat":10.76,"pickupLng":106.66,"dropLat":10.77,"dropLng":106.70}'
```
**Expected:** `{ "success": false, "message": "Service temporarily unavailable" }` + Status `502`.

---

### TC 79 — Network partition test

> **❌ FAIL** — Không có Chaos Engineering. Có thể demo bằng:
```bash
# Tạm ngắt kết nối mạng giữa containers
docker network disconnect cab-network booking-service
# Tạo booking → error
docker network connect cab-network booking-service
```

---

### TC 80 — Graceful degradation

```bash
# Tắt nhiều service phụ
docker compose stop pricing-service review-service
```
**Test core function:**
1. `POST /bookings` → vẫn tạo được (pricing fallback = 0)
2. `PUT /drivers/availability` → vẫn hoạt động
3. `GET /bookings` → vẫn hoạt động

**Expected:** Hệ thống không crash; core booking flow vẫn chạy.

---

## LEVEL 9 — SECURITY TEST

### TC 81 — SQL injection

```
POST {{BASE_URL}}/auth/login

{
  "email": "' OR 1=1 --",
  "password": "anything"
}
```
**Expected:** `400 Bad Request` hoặc `401 Unauthorized` — **không login được**.

```
GET {{BASE_URL}}/users?search=' UNION SELECT * FROM users --
Authorization: Bearer {{TOKEN}}
```
**Expected:** Query được parameterize → không leak data.

---

### TC 82 — XSS input test

```
POST {{BASE_URL}}/auth/register

{
  "email": "xss@test.com",
  "password": "123456",
  "name": "<script>alert('xss')</script>"
}
```
**Expected:** Tên được lưu as-is (escaped trong response JSON). Mở http://localhost:3010 → không có alert popup.

---

### TC 83 — JWT tampering → 401

1. Lấy valid JWT từ login
2. Sửa payload (decode base64, đổi `"role":"USER"` thành `"role":"ADMIN"`, encode lại)
3. Dùng token đã sửa:
```
GET {{BASE_URL}}/auth/me
Authorization: Bearer <tampered_token>
```
**Expected:** `401 Unauthorized` — signature không khớp.

---

### TC 84 — Unauthorized API access → 403

Dùng CUSTOMER token gọi admin endpoint:
```
GET {{BASE_URL}}/admin/users
Authorization: Bearer {{TOKEN}}  (customer token)
```
**Expected:** `403 Forbidden`

---

### TC 85 — Rate limit attack → 429

```bash
for i in {1..250}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:3000/bookings \
    -H "Authorization: Bearer $TOKEN"
done | grep 429 | wc -l
```
**Expected:** Nhiều `429` response sau khi vượt 200 req/min.

---

### TC 86 — Replay attack

1. Gọi payment API lần 1 → thành công
2. **Giữ nguyên request**, gọi lại lần 2 với cùng body:
```
POST {{BASE_URL}}/payments
{ "rideId": "{{RIDE_ID}}", "amount": 50000, "paymentMethod": "cash" }
```
**Expected lần 2:** `idempotent: true`, không tạo payment mới, không charge thêm tiền.

---

### TC 87 — Data encryption at rest

> **❌ FAIL** — Kiểm tra bằng cách truy cập DB trực tiếp:
```bash
docker compose exec postgres-payment psql -U postgres -d payment_db
SELECT * FROM payments LIMIT 1;
```
Sensitive data hiển thị plaintext (không encrypt).

---

### TC 88 — mTLS communication

> **❌ FAIL** — Services giao tiếp qua HTTP thường (không mTLS). Verify:
```bash
docker compose exec booking-service wget -q -O- http://pricing-service:3007/health
# Thành công qua HTTP thường → không có mTLS
```

---

### TC 89 — RBAC enforcement

**Test DRIVER role gọi admin API:**
```
GET {{BASE_URL}}/admin/dashboard
Authorization: Bearer {{DRIVER_TOKEN}}
```
**Expected:** `403 Forbidden`

**Test CUSTOMER role gọi driver-only API:**
```
PUT {{BASE_URL}}/drivers/availability
Authorization: Bearer {{TOKEN}}  (customer)
```
**Expected:** `403 Forbidden`

---

### TC 90 — Sensitive data masking

> **❌ FAIL** — Response và log không mask sensitive data. Verify:
```
GET {{BASE_URL}}/payments/{{PAYMENT_ID}}
Authorization: Bearer {{TOKEN}}
```
Nếu có card number → hiển thị full (không mask `****1234`).

---

## LEVEL 10 — ZERO TRUST SECURITY

### TC 91 — Request không có token → 401

```
GET {{BASE_URL}}/bookings
(không có Authorization header)
```
**Expected:** `401 Unauthorized`, `message: "Missing token"` hoặc `"No token provided"`

---

### TC 92 — Token không hợp lệ → 401

```
GET {{BASE_URL}}/auth/me
Authorization: Bearer invalid.token.here
```
**Expected:** `401 Unauthorized`, `message: "Invalid token"`

---

### TC 93 — Token hết hạn → 401

Tạo JWT với exp = 1 giây trong quá khứ (dùng jwt.io), sau đó:
```
GET {{BASE_URL}}/auth/me
Authorization: Bearer <expired_token>
```
**Expected:** `401 Unauthorized`, `message: "Token expired"`

---

### TC 94 — Service-to-service auth (mTLS)

> **❌ FAIL** — Xem TC 88.

---

### TC 95 — RBAC user thường không vào admin

```
GET {{BASE_URL}}/admin/users
Authorization: Bearer {{TOKEN}}  (customer role)
```
**Expected:** `403 Forbidden`, `message: "Access denied"`

---

### TC 96 — Driver không truy cập user data

```
GET {{BASE_URL}}/users/some-user-id
Authorization: Bearer {{DRIVER_TOKEN}}
```
**Expected:** `403 Forbidden`

---

### TC 97 — API Gateway kiểm tra tất cả request

Thử bypass gateway, gọi trực tiếp service (từ host máy):
```bash
curl http://localhost:3004/bookings  # direct to booking-service
```
Nếu service KHÔNG expose port ra ngoài Docker network (chỉ expose trong docker-compose.yml internal), request sẽ fail.

Nếu service expose port → API Gateway bypass được → lỗ hổng bảo mật (ghi nhận).

---

### TC 98 — Rate limiting chống abuse

```bash
for i in {1..120}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:3000/auth/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.com","password":"wrong"}'
done | sort | uniq -c
```
**Expected:** Sau 20 attempts (authLimiter) → `429 Too Many Requests`

---

### TC 99 — Data encryption in transit

> **❌ FAIL** — HTTP only. Verify:
```bash
curl http://localhost:3000/health  # Thành công qua HTTP
curl https://localhost:3000/health  # Fail (không có TLS)
```

---

### TC 100 — Audit logging

```bash
# Gọi vài API requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/bookings

# Xem logs
docker compose logs api-gateway --tail=20
```
**Expected:** Mỗi request được log với:
- `reqId` (UUID)
- `method`, `url`, `status`, `responseTime`
- `userAgent`

---

## LEVEL 11 — DEPLOYMENT

### TC 101 — Deploy service thành công

```bash
docker compose up --build -d
docker compose ps
```
**Expected:** Tất cả services status = `running`, không có `exited` hay `CrashLoopBackOff`.

---

### TC 102 — Health check endpoint

```bash
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009; do
  status=$(curl -s http://localhost:$port/health | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
  echo "Port $port: $status"
done
```
**Expected:** Tất cả `ok`

---

### TC 103 — Environment variables đúng

```bash
# Xem ENV của một service
docker compose exec booking-service env | grep -E "DATABASE|KAFKA|REDIS|JWT"
```
**Expected:** Tất cả biến được set (DATABASE_URL, KAFKA_BROKERS, REDIS_URL, JWT_SECRET)

---

### TC 104 — Service connect database

```bash
docker compose logs auth-service | grep -i "database\|connected\|sequelize"
```
**Expected:** "Database connected successfully" hoặc tương tự (không có connection error)

---

### TC 105 — Service connect Kafka

```bash
docker compose logs booking-service | grep -i "kafka\|producer\|connected"
```
**Expected:** "Kafka producer connected" hoặc "Connected to Kafka broker"

---

### TC 106 — Rolling update zero downtime (Kubernetes)

```bash
# Update image version
kubectl set image deployment/booking-service \
  booking-service=booking-service:v2 -n cab-system

# Trong khi update, gọi API liên tục
while true; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    http://<K8S_IP>/bookings
  sleep 0.1
done

# Monitor rollout
kubectl rollout status deployment/booking-service -n cab-system
```
**Expected:** Không có downtime (luôn 200, không có 503).

---

### TC 107 — Auto scaling HPA

```bash
# Xem HPA config
kubectl get hpa -n cab-system

# Simulate load
k6 run --vus 100 --duration 3m infra/k6/booking-load.js

# Theo dõi
kubectl get pods -n cab-system -w
```
**Expected:** Pod count tăng khi CPU > 60%.

---

### TC 108 — Service mesh routing (Istio)

> **❌ FAIL** — Istio chưa cài. Để test:
```bash
kubectl get pods -n istio-system  # → không có Istio pods
```

---

### TC 109 — Config sai → fail fast

```bash
# Sửa tạm DATABASE_URL sai trong docker-compose.yml
# environment:
#   DATABASE_URL: "postgresql://wrong:wrong@localhost/wrongdb"
docker compose up -d booking-service
docker compose logs booking-service --tail=20
```
**Expected:** Service exit với log lỗi rõ ràng; không chạy ở "half-broken" state.

---

### TC 110 — Rollback deployment (Kubernetes)

```bash
# Deploy version lỗi
kubectl set image deployment/booking-service \
  booking-service=booking-service:broken -n cab-system

# Rollback
kubectl rollout undo deployment/booking-service -n cab-system

# Verify
kubectl rollout status deployment/booking-service -n cab-system
```
**Expected:** Service quay về version trước; `GET /health` → 200 OK.

---

## LEVEL 12 — MONITORING

### TC 111 — Logging đầy đủ request

```bash
docker compose logs api-gateway --tail=20 | python3 -m json.tool
```
**Expected:** Mỗi log entry có: `method`, `url`, `status`, `responseTime`, `reqId`

---

### TC 112 — Structured logging format JSON

```bash
docker compose logs auth-service --tail=5
```
**Expected:** Output là JSON thuần (không text thường):
```json
{"level":"info","time":"...","reqId":"uuid","method":"POST","url":"/auth/login","status":200}
```

---

### TC 113 — GET /metrics → Prometheus format

```bash
curl http://localhost:3004/metrics | head -30
```
**Expected:**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",route="/bookings"} 5
```

---

### TC 114 — Dashboard Grafana hiển thị đúng

1. Mở http://localhost:3011 → Login `admin/admin123`
2. Dashboards → "CAB Booking System"
3. **Expected:**
   - Request rate hiển thị
   - P95 latency panels
   - Error rate panels
   - Không có "No data" (phải có metric data)

---

### TC 115 — Distributed tracing (Jaeger)

1. Gọi một vài API requests
2. Mở http://localhost:16686
3. Service: chọn `booking-service`
4. Click "Find Traces"
5. **Expected:** Thấy trace đi qua booking-service → pricing-service (spans)
6. Trace có `traceId` xuyên suốt

---

### TC 116 — Alert khi error rate cao

```bash
# Xem alert rules
cat infra/prometheus/alert_rules.yml | grep -A5 "HighErrorRate"

# Trigger alert: gọi nhiều request lỗi
for i in {1..50}; do
  curl -s -o /dev/null http://localhost:3000/bookings  # no token → 401
done

# Xem Prometheus alerts
curl http://localhost:9090/api/v1/alerts | python3 -m json.tool
```
**Expected:** `HighErrorRate` alert trong active alerts (sau ngưỡng).

---

### TC 117 — Alert khi latency cao

```bash
cat infra/prometheus/alert_rules.yml | grep -A5 "HighP95Latency"
```
**Verify:** Alert rule tồn tại với threshold (ví dụ > 300ms).

Để trigger: chạy k6 load test, sau đó `curl http://localhost:9090/api/v1/alerts`.

---

### TC 118 — AI service monitoring

```bash
curl http://localhost:3005/metrics | grep -E "matching_requests|eta_calculations"
```
**Expected:**
```
matching_requests_total{status="success"} 5
eta_calculations_total{vehicle_type="SEDAN"} 5
```

---

### TC 119 — Kafka monitoring

```bash
# Kafka Exporter metrics
curl http://localhost:9308/metrics | grep kafka_consumergroup_lag

# Hoặc xem trong Prometheus
curl "http://localhost:9090/api/v1/query?query=kafka_consumergroup_lag" | python3 -m json.tool
```
**Expected:** `kafka_consumergroup_lag` metric có giá trị (track consumer lag).

---

### TC 120 — Resource monitoring (CPU, Memory)

```bash
curl http://localhost:3004/metrics | grep -E "process_cpu|process_heap|nodejs_gc"
```
**Expected:**
```
process_cpu_seconds_total ...
process_heap_size_bytes ...
nodejs_gc_duration_seconds_count ...
```

**Hoặc xem Docker stats:**
```bash
docker stats --no-stream
```

---

## TỔNG HỢP LỆNH NHANH

```bash
# Health check tất cả
for p in 3001 3002 3003 3004 3005 3006 3007 3008 3009; do
  echo -n ":$p → "; curl -s http://localhost:$p/health | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))"
done

# Xem log real-time
docker compose logs -f ride-service booking-service

# Kafka topics
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Kafka consumer events
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 --topic ride.events --from-beginning --max-messages 10

# Redis check
docker compose exec redis redis-cli -a redis123 ping

# DB check
docker compose exec postgres-auth psql -U postgres -d auth_db -c "SELECT COUNT(*) FROM users;"

# k6 load test
k6 run infra/k6/booking-load.js

# Prometheus metrics
curl http://localhost:9090/api/v1/query?query=up | python3 -m json.tool
```
