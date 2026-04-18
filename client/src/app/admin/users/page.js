'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/all`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setUsers(d.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin')} className="text-gray-400">← Quay lại</button>
        <h1 className="text-xl font-bold">Quản Lý Người Dùng</h1>
        <span className="ml-auto text-sm text-gray-400">{users.length} người dùng</span>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        {loading && <div className="text-center py-16 text-gray-500">Đang tải...</div>}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-left">Số điện thoại</th>
                <th className="px-4 py-3 text-left">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name || 'Chưa cập nhật'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && users.length === 0 && <div className="text-center py-8 text-gray-400">Không có người dùng nào</div>}
        </div>
      </main>
    </div>
  );
}
