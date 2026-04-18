'use client';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const DriverRouteMap = dynamic(() => import('../../components/DriverRouteMap'), { ssr: false, loading: () => <div className="h-60 bg-gray-700 rounded-xl animate-pulse" /> });

export default function DriverDashboard() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDriverStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drivers/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setIsOnline(data.data?.isAvailable || false);
      }
    } catch {}
  };

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'DRIVER') { router.push('/auth/login'); return; }
    fetchDriverStatus();
    fetchCurrentRide();
    const interval = setInterval(fetchCurrentRide, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentRide = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const active = (data.data || []).find(r => ['ASSIGNED','PICKUP','IN_PROGRESS'].includes(r.status));
      setCurrentRide(active || null);
    } catch {}
  };

  const toggleOnline = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const newStatus = !isOnline;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drivers/availability`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAvailable: newStatus }),
      });
      setIsOnline(newStatus);
    } catch {} finally { setLoading(false); }
  };

  const updateLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const token = localStorage.getItem('accessToken');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drivers/location`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      });
    });
  };

  const startRide = async (rideId) => {
    const token = localStorage.getItem('accessToken');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides/${rideId}/start`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    fetchCurrentRide();
  };

  const completeRide = async (rideId) => {
    const token = localStorage.getItem('accessToken');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides/${rideId}/complete`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' });
    fetchCurrentRide();
  };

  const VEHICLE_LABEL = { MOTORBIKE: 'Xe máy', SEDAN: 'Xe 4 chỗ', SUV: 'Xe 7 chỗ' };
  const STATUS_LABEL = { ASSIGNED: 'Đã nhận', IN_PROGRESS: 'Đang chạy', PICKUP: 'Đang đến đón' };
  const logout = () => { localStorage.clear(); router.push('/auth/login'); };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🚗 Tài Xế</h1>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Đăng xuất</button>
      </header>

      <main className="max-w-lg mx-auto p-6 space-y-6">
        {/* Bật/Tắt nhận chuyến */}
        <div className="bg-gray-800 p-6 rounded-2xl text-center">
          <div className={`text-5xl mb-3 ${isOnline ? 'animate-pulse' : ''}`}>{isOnline ? '🟢' : '🔴'}</div>
          <div className="text-lg font-bold mb-1">{isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</div>
          <div className="text-sm text-gray-400 mb-4">{isOnline ? 'Đang chờ yêu cầu chuyến đi...' : 'Bật để nhận chuyến'}</div>
          <button onClick={toggleOnline} disabled={loading}
            className={`px-8 py-3 rounded-xl font-bold text-white transition ${isOnline ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}>
            {loading ? '...' : isOnline ? 'Tắt nhận chuyến' : 'Bật nhận chuyến'}
          </button>
          {isOnline && (
            <button onClick={updateLocation} className="block mx-auto mt-3 text-sm text-blue-400 hover:text-blue-300">
              📍 Cập nhật vị trí
            </button>
          )}
        </div>

        {/* Chuyến đi hiện tại */}
        {currentRide ? (
          <div className="bg-gray-800 p-5 rounded-2xl space-y-4">
            <h2 className="font-bold text-lg text-yellow-400">Chuyến đi hiện tại</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Trạng thái</span><span className="font-bold text-green-400">{STATUS_LABEL[currentRide.status] || currentRide.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Điểm đón</span><span>{currentRide.pickupLat?.toFixed(4)}, {currentRide.pickupLng?.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Điểm đến</span><span>{currentRide.dropoffLat?.toFixed(4)}, {currentRide.dropoffLng?.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Loại xe</span><span>{VEHICLE_LABEL[currentRide.vehicleType] || currentRide.vehicleType}</span></div>
              {currentRide.estimatedPrice > 0 && <div className="flex justify-between"><span className="text-gray-400">Giá cước</span><span className="text-yellow-400 font-bold">{currentRide.estimatedPrice?.toLocaleString()} VND</span></div>}
              {currentRide.etaMinutes && <div className="flex justify-between"><span className="text-gray-400">ETA đến đón</span><span>{currentRide.etaMinutes} phút</span></div>}
            </div>
            {/* Bản đồ tuyến đường */}
            {currentRide.pickupLat && currentRide.pickupLng && currentRide.dropoffLat && currentRide.dropoffLng && (
              <DriverRouteMap
                pickupLat={currentRide.pickupLat}
                pickupLng={currentRide.pickupLng}
                dropoffLat={currentRide.dropoffLat}
                dropoffLng={currentRide.dropoffLng}
              />
            )}

            <div className="flex gap-3">
              {currentRide.status === 'ASSIGNED' && (
                <button onClick={() => startRide(currentRide.id)} className="flex-1 bg-blue-600 py-2 rounded-xl font-bold hover:bg-blue-700">Bắt đầu chuyến</button>
              )}
              {currentRide.status === 'IN_PROGRESS' && (
                <button onClick={() => completeRide(currentRide.id)} className="flex-1 bg-green-600 py-2 rounded-xl font-bold hover:bg-green-700">Hoàn thành chuyến</button>
              )}
            </div>
          </div>
        ) : isOnline && (
          <div className="bg-gray-800 p-6 rounded-2xl text-center">
            <div className="text-4xl mb-3 animate-pulse">📡</div>
            <p className="text-gray-400">Đang chờ yêu cầu chuyến đi...</p>
          </div>
        )}

        {/* Lịch sử */}
        <button onClick={() => router.push('/driver/ride')} className="w-full bg-gray-800 text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-700">
          📋 Xem lịch sử chuyến đi
        </button>
      </main>
    </div>
  );
}
