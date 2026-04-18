'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverRideHistory() {
  const router = useRouter();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setRides(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const total = rides.filter(r => r.status === 'COMPLETED' || r.status === 'PAID').reduce((s, r) => s + (r.finalPrice || r.estimatedPrice || 0), 0);
  const VEHICLE_LABEL = { MOTORBIKE: 'Xe máy', SEDAN: 'Xe 4 chỗ', SUV: 'Xe 7 chỗ' };
  const STATUS_LABEL = { MATCHING: 'Đang ghép', ASSIGNED: 'Đã nhận', IN_PROGRESS: 'Đang chạy', COMPLETED: 'Hoàn thành', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy' };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/driver')} className="text-gray-400">← Quay lại</button>
        <h1 className="text-xl font-bold">Lịch Sử Chuyến Đi</h1>
      </header>
      <main className="max-w-lg mx-auto p-6">
        {total > 0 && (
          <div className="bg-green-900 p-4 rounded-xl mb-4 text-center">
            <div className="text-sm text-green-300">Tổng thu nhập</div>
            <div className="text-2xl font-bold text-green-400">{total.toLocaleString()} VND</div>
          </div>
        )}
        {loading && <div className="text-center py-16 text-gray-500">Đang tải...</div>}
        {!loading && rides.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-400">Chưa có chuyến đi nào.</p>
          </div>
        )}
        <div className="space-y-3">
          {rides.map(r => (
            <div key={r.id} className="bg-gray-800 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">{VEHICLE_LABEL[r.vehicleType] || r.vehicleType}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${r.status === 'PAID' ? 'bg-green-800 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</div>
              {(r.finalPrice || r.estimatedPrice) > 0 && <div className="text-yellow-400 font-bold mt-1">{(r.finalPrice || r.estimatedPrice)?.toLocaleString()} VND</div>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
