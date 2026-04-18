'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDrivers() {
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    let token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try {
      let r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drivers/all`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) { router.push('/auth/login'); return; }
        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshData = await refreshRes.json();
        if (!refreshData.success) { localStorage.clear(); router.push('/auth/login'); return; }
        localStorage.setItem('accessToken', refreshData.data.accessToken);
        localStorage.setItem('refreshToken', refreshData.data.refreshToken);
        token = refreshData.data.accessToken;
        r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drivers/all`, { headers: { Authorization: `Bearer ${token}` } });
      }
      const d = await r.json();
      setDrivers(d.data || []);
    } catch (e) { console.error('[admin/drivers] fetch error:', e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 8000);
    return () => clearInterval(interval);
  }, []);

  const STATUS_COLOR = { AVAILABLE: 'bg-green-100 text-green-700', OFFLINE: 'bg-gray-100 text-gray-500', ON_RIDE: 'bg-blue-100 text-blue-700' };
  const STATUS_LABEL = { AVAILABLE: 'Sẵn sàng', OFFLINE: 'Ngoại tuyến', ON_RIDE: 'Đang chạy' };
  const VEHICLE_LABEL = { MOTORBIKE: 'Xe máy', SEDAN: 'Xe 4 chỗ', SUV: 'Xe 7 chỗ' };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin')} className="text-gray-400">← Quay lại</button>
        <h1 className="text-xl font-bold">Quản Lý Tài Xế</h1>
        <span className="ml-auto text-sm text-gray-400">{drivers.length} tài xế</span>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        {loading && <div className="text-center py-16 text-gray-500">Đang tải...</div>}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-left">Loại xe</th>
                <th className="px-4 py-3 text-left">Đánh giá</th>
                <th className="px-4 py-3 text-left">Số chuyến</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500">{VEHICLE_LABEL[d.vehicleType] || d.vehicleType} • {d.vehiclePlate || '—'}</td>
                  <td className="px-4 py-3">⭐ {d.rating?.toFixed(1)}</td>
                  <td className="px-4 py-3">{d.totalRides}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[d.status] || 'bg-gray-100'}`}>{STATUS_LABEL[d.status] || d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && drivers.length === 0 && <div className="text-center py-8 text-gray-400">Không có tài xế nào</div>}
        </div>
      </main>
    </div>
  );
}
