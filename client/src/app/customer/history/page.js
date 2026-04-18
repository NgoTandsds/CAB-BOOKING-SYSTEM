'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setBookings(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const STATUS_BADGE = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    MATCHED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };
  const STATUS_LABEL = {
    PENDING: 'Đang chờ',
    MATCHED: 'Đã ghép xe',
    CANCELLED: 'Đã hủy',
    COMPLETED: 'Hoàn thành',
  };
  const VEHICLE_LABEL = { MOTORBIKE: 'Xe máy', SEDAN: 'Xe 4 chỗ', SUV: 'Xe 7 chỗ' };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/customer')} className="text-white">← Quay lại</button>
        <h1 className="text-xl font-bold">Lịch Sử Chuyến Đi</h1>
      </header>
      <main className="max-w-lg mx-auto p-6">
        {loading && <div className="text-center py-16 text-gray-500">Đang tải...</div>}
        {!loading && bookings.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500">Bạn chưa có chuyến đi nào.</p>
            <button onClick={() => router.push('/customer/booking')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg">Đặt xe ngay</button>
          </div>
        )}
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white p-4 rounded-xl shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">{b.pickupAddress || `(${b.pickupLat?.toFixed(3)}, ${b.pickupLng?.toFixed(3)})`}</div>
                  <div className="text-xs text-gray-400 mt-0.5">→ {b.dropoffAddress || `(${b.dropoffLat?.toFixed(3)}, ${b.dropoffLng?.toFixed(3)})`}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(b.createdAt).toLocaleDateString('vi-VN')} • {VEHICLE_LABEL[b.vehicleType] || b.vehicleType}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ml-2 ${STATUS_BADGE[b.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[b.status] || b.status}
                </span>
              </div>
              {b.estimatedPrice > 0 && <div className="text-sm font-bold text-blue-600 mt-2">{b.estimatedPrice?.toLocaleString()} VND</div>}
              {b.status === 'PENDING' && (
                <button onClick={() => router.push(`/customer/tracking?bookingId=${b.id}`)} className="text-blue-600 text-xs mt-2 font-medium">Theo dõi →</button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
