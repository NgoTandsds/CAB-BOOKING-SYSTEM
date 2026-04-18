'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RatingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rideId = searchParams.get('rideId');
  const driverId = searchParams.get('driverId');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'CUSTOMER') { router.push('/auth/login'); return; }
    if (!rideId) { router.push('/customer'); }
  }, []);

  const submit = async () => {
    if (!rating || !rideId || !driverId) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId, driverId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gửi đánh giá thất bại');
      setSubmitted(true);
      setTimeout(() => router.push('/customer/history'), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const RATING_LABEL = { 1: 'Rất tệ', 2: 'Tệ', 3: 'Bình thường', 4: 'Tốt', 5: 'Xuất sắc!' };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800">Cảm ơn bạn!</h2>
          <p className="text-gray-500 mt-2">Đánh giá của bạn đã được gửi.</p>
          <p className="text-sm text-gray-400 mt-1">Đang chuyển về lịch sử chuyến đi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <h1 className="text-xl font-bold">Đánh Giá Tài Xế</h1>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6 mt-4">
        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-3">🚕</div>
            <p className="text-gray-600 text-sm">Chuyến đi của bạn như thế nào?</p>
          </div>

          {/* Chọn sao */}
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)}
                className={`text-4xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                ★
              </button>
            ))}
          </div>
          <p className="text-center text-sm font-medium text-gray-600">{RATING_LABEL[rating]}</p>

          {/* Nhận xét */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nhận xét (tuỳ chọn)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn..."
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button onClick={submit} disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition">
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>

          <button onClick={() => router.push('/customer/history')}
            className="w-full text-gray-400 text-sm hover:text-gray-600 text-center">
            Bỏ qua
          </button>
        </div>
      </main>
    </div>
  );
}

export default function RatingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin text-4xl">⏳</div></div>}>
      <RatingContent />
    </Suspense>
  );
}
