'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const STATUS_LABELS = {
  CREATED: '⏳ Đã tạo',
  MATCHING: '🔍 Đang tìm tài xế',
  ASSIGNED: '🚕 Đã ghép tài xế',
  PICKUP: '📍 Tài xế đang đến',
  IN_PROGRESS: '🛣️ Đang di chuyển',
  COMPLETED: '✅ Hoàn thành',
  CANCELLED: '❌ Đã hủy',
  PAID: '💳 Đã thanh toán',
};

function TrackingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get('bookingId');
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    fetchRide();
    const interval = setInterval(fetchRide, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchRide = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const rides = data.data || [];
      const r = rides.find(r => r.bookingId === bookingId);
      if (r) setRide(r);
    } catch {}
    finally { setLoading(false); }
  };

  const VEHICLE_LABEL = { MOTORBIKE: 'Xe máy', SEDAN: 'Xe 4 chỗ', SUV: 'Xe 7 chỗ' };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/customer')} className="text-white">← Quay lại</button>
        <h1 className="text-xl font-bold">Theo Dõi Chuyến Đi</h1>
      </header>

      <main className="max-w-lg mx-auto p-6">
        {loading && <div className="text-center py-16 text-gray-500">Đang tải...</div>}
        {!loading && !ride && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-600">Đang tìm chuyến đi của bạn... Vui lòng chờ.</p>
            <p className="text-sm text-gray-400 mt-2">Mã đặt xe: {bookingId}</p>
          </div>
        )}
        {ride && (
          <div className="space-y-4">
            {/* Trạng thái */}
            <div className="bg-white p-5 rounded-2xl shadow text-center">
              <div className="text-4xl mb-2">{STATUS_LABELS[ride.status]?.split(' ')[0]}</div>
              <div className="text-xl font-bold text-gray-700">{STATUS_LABELS[ride.status]?.split(' ').slice(1).join(' ')}</div>
              {ride.etaMinutes && ride.status === 'ASSIGNED' && (
                <div className="mt-2 text-blue-600 font-medium">Dự kiến đến: {ride.etaMinutes} phút</div>
              )}
            </div>

            {/* Thông tin chuyến */}
            <div className="bg-white p-5 rounded-2xl shadow space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Loại xe</span>
                <span className="font-medium">{VEHICLE_LABEL[ride.vehicleType] || ride.vehicleType}</span>
              </div>
              {ride.estimatedPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Giá ước tính</span>
                  <span className="font-medium text-blue-600">{ride.estimatedPrice?.toLocaleString()} VND</span>
                </div>
              )}
              {ride.finalPrice && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Giá thực tế</span>
                  <span className="font-bold text-green-600">{ride.finalPrice?.toLocaleString()} VND</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Trạng thái</span>
                <span className="font-bold">{STATUS_LABELS[ride.status] || ride.status}</span>
              </div>
            </div>

            {/* Thanh toán & Đánh giá */}
            {ride.status === 'COMPLETED' && (
              <button onClick={() => router.push(`/customer/payment?rideId=${ride.id}`)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
                💳 Thanh toán ngay
              </button>
            )}
            {ride.status === 'PAID' && ride.driverId && (
              <button onClick={() => router.push(`/customer/rating?rideId=${ride.id}&driverId=${ride.driverId}`)}
                className="w-full bg-yellow-500 text-white py-3 rounded-xl font-bold">
                ⭐ Đánh giá tài xế
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Đang tải...</p></div>}>
      <TrackingContent />
    </Suspense>
  );
}
