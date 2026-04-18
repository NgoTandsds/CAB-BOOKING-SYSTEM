'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminPricing() {
  const router = useRouter();
  const [surge, setSurge] = useState({ surgeMultiplier: 1.0, demand: 0, supply: 0 });
  const [newSurge, setNewSurge] = useState({ area: 'district_1', demand: '', supply: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'ADMIN') { router.push('/auth/login'); return; }
    fetchSurge();
    const interval = setInterval(fetchSurge, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSurge = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/surge`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setSurge(data.data);
    } catch {} finally { setLoading(false); }
  };

  const updateSurge = async () => {
    if (!newSurge.demand || !newSurge.supply) { setMsg('Vui lòng nhập chỉ số cầu và cung'); return; }
    setSaving(true); setMsg('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/surge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ area: newSurge.area, demand: Number(newSurge.demand), supply: Number(newSurge.supply) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Thất bại');
      setMsg('Cập nhật surge thành công!');
      fetchSurge();
    } catch (e) { setMsg(`Lỗi: ${e.message}`); }
    finally { setSaving(false); }
  };

  const surgeColor = (m) => m >= 2 ? 'text-red-500' : m >= 1.5 ? 'text-orange-500' : m > 1 ? 'text-yellow-500' : 'text-green-500';
  const surgeLevel = (m) => m >= 2 ? 'NGHIÊM TRỌNG' : m >= 1.5 ? 'CAO' : m > 1 ? 'TĂNG NHẸ' : 'Bình thường';

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white">← Bảng điều khiển</Link>
          <h1 className="text-xl font-bold">Quản Lý Giá & Surge</h1>
        </div>
        <button onClick={() => { localStorage.clear(); router.push('/auth/login'); }} className="text-sm text-gray-400 hover:text-white">Đăng xuất</button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Trạng thái surge hiện tại */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <p className="text-sm text-gray-500 mb-1">Hệ số Surge</p>
            <p className={`text-4xl font-bold ${surgeColor(surge.surgeMultiplier)}`}>
              x{(surge.surgeMultiplier || 1).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{surgeLevel(surge.surgeMultiplier)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <p className="text-sm text-gray-500 mb-1">Nhu cầu (Cầu)</p>
            <p className="text-4xl font-bold text-blue-600">{surge.demand || 0}</p>
            <p className="text-xs text-gray-400 mt-1">yêu cầu đặt xe</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <p className="text-sm text-gray-500 mb-1">Tài xế (Cung)</p>
            <p className="text-4xl font-bold text-purple-600">{surge.supply || 0}</p>
            <p className="text-xs text-gray-400 mt-1">tài xế online</p>
          </div>
        </div>

        {/* Công thức surge */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold text-gray-700 mb-3">Công thức tính Surge</h2>
          <div className="bg-gray-50 rounded-xl p-4 font-mono text-center text-lg">
            surge = max(1.0, cầu / cung)
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Hệ số surge không bao giờ thấp hơn 1.0. Tăng tỷ lệ thuận khi cầu vượt cung.
            Được cache trong Redis với TTL 60 giây.
          </p>
        </div>

        {/* Điều chỉnh thủ công */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold text-gray-700 mb-4">Điều chỉnh Surge thủ công</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Khu vực</label>
              <select value={newSurge.area} onChange={e => setNewSurge({ ...newSurge, area: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="district_1">Quận 1</option>
                <option value="district_3">Quận 3</option>
                <option value="district_7">Quận 7</option>
                <option value="tan_binh">Tân Bình</option>
                <option value="binh_thanh">Bình Thạnh</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Chỉ số cầu</label>
              <input type="number" min="0" value={newSurge.demand}
                onChange={e => setNewSurge({ ...newSurge, demand: e.target.value })}
                placeholder="vd: 50"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Chỉ số cung</label>
              <input type="number" min="1" value={newSurge.supply}
                onChange={e => setNewSurge({ ...newSurge, supply: e.target.value })}
                placeholder="vd: 20"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {newSurge.demand && newSurge.supply && (
            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-center text-sm">
              Xem trước: <span className="font-bold text-blue-700">
                x{Math.max(1.0, newSurge.demand / newSurge.supply).toFixed(2)}
              </span>
            </div>
          )}
          {msg && <p className={`text-sm mb-3 ${msg.startsWith('Lỗi') ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>}
          <button onClick={updateSurge} disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? 'Đang cập nhật...' : 'Cập nhật Surge'}
          </button>
        </div>
      </main>
    </div>
  );
}
