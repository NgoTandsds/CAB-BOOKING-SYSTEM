'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRides() {
  const router = useRouter();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchRides = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides/all`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setRides(d.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 5000);
    return () => clearInterval(interval);
  }, []);

  const STATUSES = ['ALL','MATCHING','ASSIGNED','IN_PROGRESS','COMPLETED','PAID','CANCELLED'];
  const STATUS_LABEL = { ALL: 'Tất cả', MATCHING: 'Đang ghép', ASSIGNED: 'Đã nhận', IN_PROGRESS: 'Đang chạy', COMPLETED: 'Hoàn thành', PAID: 'Đã TT', CANCELLED: 'Đã hủy' };
  const STATUS_COLOR = { MATCHING: 'bg-yellow-100 text-yellow-700', ASSIGNED: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-indigo-100 text-indigo-700', COMPLETED: 'bg-green-100 text-green-700', PAID: 'bg-purple-100 text-purple-700', CANCELLED: 'bg-red-100 text-red-700' };
  const VEHICLE_LABEL = { MOTORBIKE: 'Xe máy', SEDAN: 'Xe 4 chỗ', SUV: 'Xe 7 chỗ' };
  const filtered = filter === 'ALL' ? rides : rides.filter(r => r.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin')} className="text-gray-400">← Quay lại</button>
        <h1 className="text-xl font-bold">Quản Lý Chuyến Đi</h1>
        <span className="ml-auto text-sm text-gray-400">{filtered.length} chuyến</span>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex gap-2 flex-wrap mb-4">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1 rounded-full font-bold border ${filter === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600'}`}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {loading && <div className="text-center py-16 text-gray-500">Đang tải...</div>}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Mã chuyến</th>
                <th className="px-4 py-3 text-left">Loại xe</th>
                <th className="px-4 py-3 text-left">Giá tiền</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.id?.slice(0, 8)}...</td>
                  <td className="px-4 py-3">{VEHICLE_LABEL[r.vehicleType] || r.vehicleType}</td>
                  <td className="px-4 py-3">{(r.finalPrice || r.estimatedPrice || 0).toLocaleString()} VND</td>
                  <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-500'}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                  <td className="px-4 py-3 text-gray-400">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <div className="text-center py-8 text-gray-400">Không có chuyến đi nào</div>}
        </div>
      </main>
    </div>
  );
}
