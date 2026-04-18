'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const LOG_LEVELS = ['TẤT CẢ', 'ERROR', 'WARN', 'INFO'];
const LOG_LEVELS_MAP = { 'TẤT CẢ': 'ALL', 'ERROR': 'ERROR', 'WARN': 'WARN', 'INFO': 'INFO' };
const SERVICES = ['ALL', 'api-gateway', 'auth-service', 'booking-service', 'driver-service', 'ride-service', 'payment-service', 'pricing-service', 'notification-service', 'review-service'];
const SERVICE_LABEL = { 'ALL': 'Tất cả service' };

const generateLogs = () => {
  const entries = [
    { level: 'INFO', service: 'auth-service', message: 'POST /auth/login 200 42ms', traceId: 'abc123' },
    { level: 'INFO', service: 'booking-service', message: 'Đặt xe thành công bookingId=b-001 idempotent=false', traceId: 'def456' },
    { level: 'INFO', service: 'ride-service', message: 'ride.created nhận được, đang ghép tài xế...', traceId: 'def456' },
    { level: 'INFO', service: 'ride-service', message: 'Đã ghép tài xế driverId=d-007 ETA=8phút', traceId: 'def456' },
    { level: 'WARN', service: 'booking-service', message: 'Circuit breaker giá HALF-OPEN', traceId: 'ghi789' },
    { level: 'INFO', service: 'payment-service', message: 'Khởi tạo thanh toán rideId=r-003 amount=85000', traceId: 'jkl012' },
    { level: 'INFO', service: 'notification-service', message: 'Đã gửi thông báo userId=u-001 type=RIDE_ASSIGNED', traceId: 'def456' },
    { level: 'ERROR', service: 'pricing-service', message: 'Redis timeout, dùng surge mặc định=1.0', traceId: 'mno345' },
    { level: 'INFO', service: 'api-gateway', message: 'GET /bookings 200 12ms userId=u-001', traceId: 'pqr678' },
    { level: 'WARN', service: 'ride-service', message: 'Lấy tài xế thất bại lần 1, thử lại sau 500ms', traceId: 'stu901' },
    { level: 'INFO', service: 'driver-service', message: 'Cập nhật vị trí tài xế driverId=d-007', traceId: 'vwx234' },
    { level: 'INFO', service: 'ride-service', message: 'Hoàn thành chuyến rideId=r-003 status=COMPLETED', traceId: 'jkl012' },
    { level: 'ERROR', service: 'api-gateway', message: 'JWT xác thực thất bại: TokenExpiredError', traceId: 'yza567' },
    { level: 'INFO', service: 'payment-service', message: 'Saga hoàn tất: payment.completed đã publish', traceId: 'jkl012' },
    { level: 'INFO', service: 'review-service', message: 'Đánh giá tạo thành công rideId=r-003 rating=5', traceId: 'bcd890' },
  ];
  const now = Date.now();
  return entries.map((e, i) => ({
    ...e,
    timestamp: new Date(now - (entries.length - i) * 8000).toISOString(),
    id: `log-${i}`,
  }));
};

export default function AdminLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ level: 'ALL', service: 'ALL', search: '' });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'ADMIN') { router.push('/auth/login'); return; }
    setLogs(generateLogs());
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: Math.random() > 0.9 ? 'WARN' : 'INFO',
          service: SERVICES[Math.floor(Math.random() * (SERVICES.length - 1)) + 1],
          message: 'Health check /health 200 2ms',
          traceId: Math.random().toString(36).substring(7),
        };
        return [...prev.slice(-100), newLog];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (autoRefresh && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filtered = logs.filter(l =>
    (filter.level === 'ALL' || l.level === filter.level) &&
    (filter.service === 'ALL' || l.service === filter.service) &&
    (filter.search === '' || l.message.toLowerCase().includes(filter.search.toLowerCase()) || l.traceId?.includes(filter.search))
  );

  const levelColor = (level) => ({
    ERROR: 'text-red-400 bg-red-900/20',
    WARN: 'text-yellow-400 bg-yellow-900/20',
    INFO: 'text-green-400 bg-green-900/20',
  }[level] || 'text-gray-400');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 px-6 py-4 flex justify-between items-center shadow border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Bảng điều khiển</Link>
          <h1 className="text-xl font-bold">Nhật Ký Hệ Thống</h1>
          <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setAutoRefresh(v => !v)}
            className={`text-sm px-3 py-1 rounded-lg font-medium ${autoRefresh ? 'bg-green-800 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
            {autoRefresh ? 'Trực tiếp' : 'Tạm dừng'}
          </button>
          <button onClick={() => { localStorage.clear(); router.push('/auth/login'); }} className="text-sm text-gray-400 hover:text-white">Đăng xuất</button>
        </div>
      </header>

      {/* Bộ lọc */}
      <div className="bg-gray-900 px-6 py-3 flex gap-4 items-center border-b border-gray-800 flex-wrap">
        <select value={filter.level} onChange={e => setFilter({ ...filter, level: e.target.value })}
          className="bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option value="ALL">Tất cả cấp độ</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
        </select>
        <select value={filter.service} onChange={e => setFilter({ ...filter, service: e.target.value })}
          className="bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          {SERVICES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'Tất cả service' : s}</option>)}
        </select>
        <input value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
          placeholder="Tìm theo nội dung hoặc traceId..."
          className="bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none flex-1 min-w-48" />
        <span className="text-xs text-gray-500">{filtered.length} bản ghi</span>
      </div>

      {/* Bảng log */}
      <div className="overflow-auto font-mono text-xs">
        <table className="w-full">
          <thead className="bg-gray-900 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-gray-400 font-medium w-44">Thời gian</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium w-16">Cấp độ</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium w-36">Service</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium">Nội dung</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium w-24">TraceID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id} className="border-t border-gray-800 hover:bg-gray-900/50">
                <td className="px-4 py-1.5 text-gray-500">{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</td>
                <td className="px-4 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${levelColor(log.level)}`}>{log.level}</span>
                </td>
                <td className="px-4 py-1.5 text-blue-400">{log.service}</td>
                <td className="px-4 py-1.5 text-gray-200">{log.message}</td>
                <td className="px-4 py-1.5 text-gray-500 truncate">{log.traceId}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
