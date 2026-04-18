'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '', password: '', name: '', phone: '', role: 'CUSTOMER',
    vehicleType: 'SEDAN', vehiclePlate: '', licenseNumber: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (form.name.trim().length < 2) return 'Họ tên phải có ít nhất 2 ký tự';
    if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(form.phone)) return 'Số điện thoại không hợp lệ (phải là 10 số, bắt đầu bằng 03/05/07/08/09)';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email không hợp lệ';
    if (form.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    if (form.role === 'DRIVER') {
      if (!form.vehiclePlate.trim()) return 'Vui lòng nhập biển số xe';
      if (form.vehiclePlate.trim().length < 5) return 'Biển số xe không hợp lệ';
      if (!form.licenseNumber.trim()) return 'Vui lòng nhập số GPLX';
      if (form.licenseNumber.trim().length < 6) return 'Số GPLX không hợp lệ';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(''); setLoading(true);
    try {
      // Bước 1: Auth register
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Đăng ký thất bại'); return; }

      const { accessToken, refreshToken, user } = data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userId', user.id);

      // Bước 2: Tạo profile tùy vai trò
      if (user.role === 'DRIVER') {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drivers/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            name: form.name, phone: form.phone,
            vehicleType: form.vehicleType, vehiclePlate: form.vehiclePlate,
            licenseNumber: form.licenseNumber,
          }),
        });
        router.push('/driver');
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ name: form.name, phone: form.phone }),
        });
        router.push('/customer');
      }
    } catch { setError('Lỗi kết nối. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  };

  const isDriver = form.role === 'DRIVER';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚕</div>
          <h1 className="text-2xl font-bold text-blue-600">Tạo Tài Khoản</h1>
          <p className="text-sm text-gray-400 mt-1">Đăng ký để bắt đầu sử dụng dịch vụ</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vai trò - để lên đầu để form thay đổi theo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ value: 'CUSTOMER', label: '🧑 Khách hàng' }, { value: 'DRIVER', label: '🚗 Tài xế' }].map(r => (
                <button type="button" key={r.value} onClick={() => setForm({ ...form, role: r.value })}
                  className={`py-2 rounded-lg border-2 text-sm font-medium transition ${form.role === r.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
            <input type="tel" required pattern="(0[35789])[0-9]{8}" maxLength={10} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0901234567 (10 số)" />
            <p className="text-xs text-gray-400 mt-1">Định dạng: 10 số, bắt đầu bằng 03/05/07/08/09</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ban@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
            <input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tối thiểu 6 ký tự" />
          </div>

          {/* Thông tin xe - chỉ hiện khi DRIVER */}
          {isDriver && (
            <div className="border-t pt-4 space-y-4">
              <div className="text-sm font-semibold text-gray-600">Thông tin xe</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại xe <span className="text-red-500">*</span></label>
                <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="SEDAN">🚗 Xe 4 chỗ</option>
                  <option value="SUV">🚙 Xe 7 chỗ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biển số xe <span className="text-red-500">*</span></label>
                <input type="text" required={isDriver} value={form.vehiclePlate} onChange={e => setForm({ ...form, vehiclePlate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="51A-12345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số GPLX <span className="text-red-500">*</span></label>
                <input type="text" required={isDriver} value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="12345678" />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Đã có tài khoản? <Link href="/auth/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
