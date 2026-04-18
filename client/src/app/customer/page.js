'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerDashboard() {
  const router = useRouter();
  const [activeBookings, setActiveBookings] = useState([]);
  const [surge, setSurge] = useState(1.0);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'CUSTOMER') { router.push('/auth/login'); return; }
    fetchBookings(); fetchSurge();
    const interval = setInterval(() => { fetchBookings(); fetchSurge(); }, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const [bookingsRes, ridesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const bookingsData = await bookingsRes.json();
      const ridesData = await ridesRes.json();
      const rides = ridesData.data || [];
      const DONE_STATUSES = ['COMPLETED', 'PAID', 'CANCELLED'];
      const active = (bookingsData.data || []).filter(b => {
        if (b.status !== 'PENDING' && b.status !== 'MATCHED') return false;
        const ride = rides.find(r => r.bookingId === b.id);
        if (ride && DONE_STATUSES.includes(ride.status)) return false;
        return true;
      });
      setActiveBookings(active);
    } catch {}
  };

  const fetchSurge = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/surge`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSurge(data.data?.surgeMultiplier || 1.0);
    } catch {}
  };

  const cancelBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/cancel`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchBookings();
    } catch {}
  };

  const logout = () => { localStorage.clear(); router.push('/auth/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">🚕 Đặt Xe</h1>
        <div className="flex gap-3 items-center">
          {surge > 1 && <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">SURGE x{surge.toFixed(1)}</span>}
          <button onClick={logout} className="text-sm bg-white text-blue-600 px-3 py-1 rounded-lg font-medium">Đăng xuất</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Thao tác nhanh */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/customer/booking" className="bg-blue-600 text-white p-5 rounded-2xl shadow hover:bg-blue-700 transition text-center">
            <div className="text-3xl mb-2">🚕</div>
            <div className="font-bold">Đặt Xe</div>
            <div className="text-xs opacity-80 mt-1">Chọn điểm đón &amp; điểm đến</div>
          </Link>
          <Link href="/customer/history" className="bg-white text-gray-700 p-5 rounded-2xl shadow hover:bg-gray-50 transition text-center border">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-bold">Lịch Sử</div>
            <div className="text-xs text-gray-500 mt-1">Xem các chuyến đã đi</div>
          </Link>
        </div>

        {/* Đặt xe đang hoạt động */}
        {activeBookings.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-700 mb-3">Đặt Xe Đang Chờ</h2>
            <div className="space-y-3">
              {activeBookings.map(b => (
                <div key={b.id} className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
                  <Link href={`/customer/tracking?bookingId=${b.id}`} className="block hover:opacity-80 transition">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{b.pickupAddress || `${b.pickupLat?.toFixed(4)}, ${b.pickupLng?.toFixed(4)}`}</div>
                        <div className="text-xs text-gray-500">→ {b.dropoffAddress || `${b.dropoffLat?.toFixed(4)}, ${b.dropoffLng?.toFixed(4)}`}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.status === 'MATCHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {b.status === 'MATCHED' ? 'Đã ghép' : 'Đang chờ'}
                      </span>
                    </div>
                    {b.estimatedPrice > 0 && <div className="text-xs text-blue-600 mt-1 font-medium">{b.estimatedPrice.toLocaleString()} VND</div>}
                  </Link>
                  {b.status === 'PENDING' && (
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium underline"
                    >
                      Hủy đặt xe
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thông tin giá */}
        <div className="bg-white p-4 rounded-xl shadow text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Hệ số giá hiện tại</span>
            <span className={`font-bold ${surge > 1.5 ? 'text-red-500' : surge > 1 ? 'text-yellow-500' : 'text-green-500'}`}>x{surge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Trạng thái giá</span>
            <span className="text-green-600 font-medium">{surge === 1.0 ? 'Bình thường' : 'Giá cao điểm'}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
