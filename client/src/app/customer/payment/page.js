'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rideId = searchParams.get('rideId');
  const [ride, setRide] = useState(null);
  const [method, setMethod] = useState('WALLET');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'CUSTOMER') { router.push('/auth/login'); return; }
    if (!rideId) { router.push('/customer'); return; }
    fetchRide();
  }, []);

  const fetchRide = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides/${rideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRide(data.data);
    } catch { setError('Không thể tải thông tin chuyến đi'); }
    finally { setLoading(false); }
  };

  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId, method, amount: ride?.estimatedPrice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Thanh toán thất bại');
      router.push(`/customer/rating?rideId=${rideId}&driverId=${ride?.driverId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin text-4xl">⏳</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <h1 className="text-xl font-bold">Thanh Toán</h1>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-4 mt-4">
        {/* Tóm tắt chuyến đi */}
        {ride && (
          <div className="bg-white rounded-2xl shadow p-5 space-y-3">
            <h2 className="font-bold text-gray-700">Thông tin chuyến đi</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Điểm đón</span>
                <span className="font-medium">{ride.pickupLat?.toFixed(4)}, {ride.pickupLng?.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Điểm đến</span>
                <span className="font-medium">{ride.dropoffLat?.toFixed(4)}, {ride.dropoffLng?.toFixed(4)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>Tổng tiền</span>
                <span className="text-blue-600">{ride.estimatedPrice?.toLocaleString()} VND</span>
              </div>
            </div>
          </div>
        )}

        {/* Phương thức thanh toán */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h2 className="font-bold text-gray-700">Phương thức thanh toán</h2>
          <div className="space-y-2">
            {[
              { value: 'WALLET', label: '💳 Ví điện tử', desc: 'Thanh toán qua ví trong ứng dụng' },
              { value: 'CASH', label: '💵 Tiền mặt', desc: 'Thanh toán trực tiếp cho tài xế' },
              { value: 'CARD', label: '🏦 Thẻ ngân hàng', desc: 'Thẻ tín dụng hoặc ghi nợ' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setMethod(opt.value)}
                className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition ${method === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                <span className="text-2xl">{opt.label.split(' ')[0]}</span>
                <div>
                  <div className="font-medium text-sm">{opt.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </div>
                {method === opt.value && <span className="ml-auto text-blue-500 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl">{error}</p>}

        <button onClick={pay} disabled={paying || !ride}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 shadow-lg transition">
          {paying ? 'Đang xử lý...' : `Thanh toán ${ride?.estimatedPrice?.toLocaleString() || 0} VND`}
        </button>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin text-4xl">⏳</div></div>}>
      <PaymentContent />
    </Suspense>
  );
}
