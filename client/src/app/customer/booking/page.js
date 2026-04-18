'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const VEHICLE_TYPES = [
  { type: 'SEDAN', label: 'Xe 4 chỗ', icon: '🚗', desc: '4 chỗ, thoải mái' },
  { type: 'SUV', label: 'Xe 7 chỗ', icon: '🚙', desc: '7 chỗ, rộng rãi' },
];

// Rút gọn display_name: lấy 3 phần đầu
function shortenAddress(displayName) {
  const parts = displayName.split(', ');
  return parts.slice(0, 3).join(', ');
}

// Auto refresh token khi 401
async function apiFetch(url, options, router) {
  let res = await fetch(url, options);
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) { router.push('/auth/login'); return null; }
    try {
      const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const refreshData = await refreshRes.json();
      if (refreshData.success) {
        localStorage.setItem('accessToken', refreshData.data.accessToken);
        localStorage.setItem('refreshToken', refreshData.data.refreshToken);
        // Retry với token mới
        const newOptions = { ...options, headers: { ...options.headers, Authorization: `Bearer ${refreshData.data.accessToken}` } };
        res = await fetch(url, newOptions);
      } else {
        localStorage.clear(); router.push('/auth/login'); return null;
      }
    } catch { localStorage.clear(); router.push('/auth/login'); return null; }
  }
  return res;
}

function AddressInput({ label, value, onChange, onSelect }) {
  const [query, setQuery] = useState(value.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange({ address: q, lat: '', lng: '' });
    clearTimeout(debounceRef.current);
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=vn`,
          { headers: { 'Accept-Language': 'vi' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 500);
  };

  const handleSelect = (item) => {
    const short = shortenAddress(item.display_name);
    setQuery(short);
    setSuggestions([]);
    setOpen(false);
    setManualLat(parseFloat(item.lat).toFixed(6));
    setManualLng(parseFloat(item.lon).toFixed(6));
    onSelect({ address: short, lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
  };

  const applyManual = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) return;
    onSelect({ address: query || `${lat}, ${lng}`, lat, lng });
  };

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={handleQueryChange}
          placeholder={`Nhập địa chỉ ${label.toLowerCase()}...`}
          className="w-full border rounded-lg px-3 py-2 text-sm pr-8"
          autoComplete="off"
        />
        {loading && <span className="absolute right-2 top-2.5 text-gray-400 text-xs">⏳</span>}
      </div>

      {/* Trạng thái tọa độ */}
      {value.lat ? (
        <div className="text-xs text-green-600 flex items-center gap-1">
          <span>📍</span>
          <span>Vĩ độ: {Number(value.lat).toFixed(5)}, Kinh độ: {Number(value.lng).toFixed(5)}</span>
          <button onClick={() => setShowManual(!showManual)} className="ml-auto text-gray-400 hover:text-blue-500 underline">
            {showManual ? 'Ẩn' : 'Sửa tọa độ'}
          </button>
        </div>
      ) : null}

      {/* Dropdown gợi ý */}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {suggestions.map((item) => (
            <li key={item.place_id} onMouseDown={() => handleSelect(item)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0">
              <div className="font-medium text-gray-800">{shortenAddress(item.display_name)}</div>
              <div className="text-xs text-gray-400 truncate">{item.display_name}</div>
            </li>
          ))}
        </ul>
      )}

      {/* Nhập tọa độ thủ công */}
      {(showManual || (!value.lat && query.length > 0)) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <div className="text-xs text-amber-700 font-medium">
            📌 Nhập tọa độ thủ công (copy từ Google Maps)
          </div>
          <div className="text-xs text-gray-500">
            Chuột phải vào vị trí trên Google Maps → Copy tọa độ
          </div>
          <div className="flex gap-2">
            <input
              type="number" step="0.000001" placeholder="Vĩ độ (vd: 10.82282)"
              value={manualLat} onChange={e => setManualLat(e.target.value)}
              className="flex-1 border rounded px-2 py-1.5 text-xs"
            />
            <input
              type="number" step="0.000001" placeholder="Kinh độ (vd: 106.68559)"
              value={manualLng} onChange={e => setManualLng(e.target.value)}
              className="flex-1 border rounded px-2 py-1.5 text-xs"
            />
          </div>
          <button onClick={applyManual}
            className="w-full bg-amber-500 text-white py-1.5 rounded text-xs font-bold hover:bg-amber-600">
            Áp dụng tọa độ này
          </button>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pickup, setPickup] = useState({ address: '', lat: '', lng: '' });
  const [dropoff, setDropoff] = useState({ address: '', lat: '', lng: '' });
  const [vehicleType, setVehicleType] = useState('SEDAN');
  const [priceInfo, setPriceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canProceed = pickup.lat && pickup.lng && dropoff.lat && dropoff.lng;

  const getPrice = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pricing/calculate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pickupLat: pickup.lat, pickupLng: pickup.lng, dropoffLat: dropoff.lat, dropoffLng: dropoff.lng, vehicleType }),
        },
        router
      );
      if (!res) return;
      const data = await res.json();
      if (data.success) { setPriceInfo(data.data); setStep(2); }
      else setError(data.message);
    } catch { setError('Không thể kết nối dịch vụ giá'); }
    finally { setLoading(false); }
  };

  const createBooking = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const idempotencyKey = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify({ pickupLat: pickup.lat, pickupLng: pickup.lng, pickupAddress: pickup.address, dropoffLat: dropoff.lat, dropoffLng: dropoff.lng, dropoffAddress: dropoff.address, vehicleType }),
        },
        router
      );
      if (!res) return;
      const data = await res.json();
      if (data.success) { setStep(3); setTimeout(() => router.push(`/customer/tracking?bookingId=${data.data.id}`), 2000); }
      else setError(data.message);
    } catch { setError('Đặt xe thất bại'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/customer')} className="text-white">← Quay lại</button>
        <h1 className="text-xl font-bold">Đặt Xe</h1>
      </header>

      <main className="max-w-lg mx-auto p-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 ml-2">✕</button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow space-y-3">
              <h2 className="font-bold text-gray-700">📍 Điểm đón</h2>
              <AddressInput label="Điểm đón" value={pickup} onChange={setPickup} onSelect={setPickup} />
            </div>
            <div className="bg-white p-5 rounded-2xl shadow space-y-3">
              <h2 className="font-bold text-gray-700">🏁 Điểm đến</h2>
              <AddressInput label="Điểm đến" value={dropoff} onChange={setDropoff} onSelect={setDropoff} />
            </div>
            <button
              onClick={getPrice}
              disabled={loading || !canProceed}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'Đang tính giá...' : 'Xem tuỳ chọn xe →'}
            </button>
          </div>
        )}

        {step === 2 && priceInfo && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl text-sm">
              <div className="font-bold text-blue-800 mb-2">Giá ước tính</div>
              <div className="text-blue-700 text-xs mb-1 line-clamp-1">Từ: {pickup.address}</div>
              <div className="text-blue-700 text-xs mb-2 line-clamp-1">Đến: {dropoff.address}</div>
              <div className="text-blue-700">Khoảng cách: {priceInfo.distanceKm} km</div>
              {priceInfo.surgeMultiplier > 1 && (
                <div className="text-orange-600 font-medium">Hệ số cao điểm: x{priceInfo.surgeMultiplier.toFixed(2)}</div>
              )}
              <div className="text-2xl font-bold text-blue-900 mt-2">{priceInfo.totalPrice?.toLocaleString()} VND</div>
            </div>
            <div className="space-y-3">
              {VEHICLE_TYPES.map(v => (
                <button key={v.type} onClick={() => setVehicleType(v.type)}
                  className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition ${vehicleType === v.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-3xl">{v.icon}</span>
                  <div className="text-left">
                    <div className="font-bold">{v.label}</div>
                    <div className="text-xs text-gray-500">{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={createBooking} disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-50">
              {loading ? 'Đang đặt xe...' : 'Xác nhận đặt xe'}
            </button>
            <button onClick={() => setStep(1)} className="w-full text-gray-500 py-2 text-sm">← Thay đổi địa điểm</button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 animate-pulse">🔍</div>
            <h2 className="text-xl font-bold text-gray-700">Đang tìm tài xế...</h2>
            <p className="text-gray-500 mt-2">Hệ thống AI đang ghép tài xế phù hợp nhất cho bạn</p>
            <div className="mt-4 text-sm text-blue-600">Đang chuyển sang theo dõi chuyến đi...</div>
          </div>
        )}
      </main>
    </div>
  );
}
