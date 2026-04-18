'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ rides: 0, bookings: 0 });
  const [surge, setSurge] = useState(1.0);
  const [surgeInput, setSurgeInput] = useState({ demandIndex: '', supplyIndex: '' });

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'ADMIN') { router.push('/auth/login'); return; }
    fetchStats(); fetchSurge();
    const interval = setInterval(() => { fetchStats(); fetchSurge(); }, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const [ridesRes, bookingsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/all`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [ridesData, bookingsData] = await Promise.all([ridesRes.json(), bookingsRes.json()]);
      setStats({ rides: ridesData.data?.length || 0, bookings: bookingsData.data?.length || 0 });
    } catch {}
  };

  const fetchSurge = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/surge`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSurge(data.data?.surgeMultiplier || 1.0);
    } catch {}
  };

  const updateSurge = async () => {
    const token = localStorage.getItem('accessToken');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/surge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ area: 'default', demandIndex: parseFloat(surgeInput.demandIndex) || 1, supplyIndex: parseFloat(surgeInput.supplyIndex) || 1 }),
    });
    fetchSurge();
  };

  const logout = () => { localStorage.clear(); router.push('/auth/login'); };

  const KPICard = ({ title, value, icon, color }) => (
    <div className={`bg-white p-5 rounded-2xl shadow border-l-4 ${color}`}>
      <div className="flex justify-between items-center">
        <div><div className="text-sm text-gray-500">{title}</div><div className="text-2xl font-bold">{value}</div></div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Bảng Điều Khiển Admin</h1>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Đăng xuất</button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Thống kê */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPICard title="Tổng chuyến đi" value={stats.rides} icon="🚕" color="border-blue-500" />
          <KPICard title="Tổng đặt xe" value={stats.bookings} icon="📋" color="border-green-500" />
          <KPICard title="Hệ số surge" value={`x${surge.toFixed(2)}`} icon="⚡" color="border-yellow-500" />
        </div>

        {/* Điều hướng */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { href: '/admin/users', icon: '👥', label: 'Người dùng' },
            { href: '/admin/drivers', icon: '🚗', label: 'Tài xế' },
            { href: '/admin/rides', icon: '🛣️', label: 'Chuyến đi' },
            { href: '/admin/pricing', icon: '⚡', label: 'Giá & Surge' },
            { href: '/admin/logs', icon: '📜', label: 'Nhật ký hệ thống' },
          ].map(item => (
            <Link key={item.label} href={item.href} className="bg-white p-4 rounded-xl shadow hover:shadow-md transition text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-medium text-gray-700 text-sm">{item.label}</div>
            </Link>
          ))}
        </div>

        {/* Điều chỉnh Surge */}
        <div className="bg-white p-5 rounded-2xl shadow">
          <h2 className="font-bold text-gray-700 mb-4">⚡ Điều chỉnh giá Surge</h2>
          <div className="text-sm text-gray-500 mb-3">Hiện tại: x{surge.toFixed(2)} | Công thức: max(1.0, cầu/cung)</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Chỉ số cầu</label>
              <input type="number" step="0.1" min="0" value={surgeInput.demandIndex} onChange={e => setSurgeInput({...surgeInput, demandIndex: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="vd: 2.5" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Chỉ số cung</label>
              <input type="number" step="0.1" min="0.1" value={surgeInput.supplyIndex} onChange={e => setSurgeInput({...surgeInput, supplyIndex: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="vd: 1.0" />
            </div>
          </div>
          <button onClick={updateSurge} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600">
            Cập nhật Surge
          </button>
        </div>
      </main>
    </div>
  );
}
