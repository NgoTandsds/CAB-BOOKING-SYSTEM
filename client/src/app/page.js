'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const role = localStorage.getItem('userRole');
    if (token && role) {
      if (role === 'CUSTOMER') router.push('/customer');
      else if (role === 'DRIVER') router.push('/driver');
      else if (role === 'ADMIN') router.push('/admin');
    } else {
      router.push('/auth/login');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-600">Hệ Thống Đặt Xe</h1>
        <p className="text-gray-500 mt-2">Đang chuyển trang...</p>
      </div>
    </div>
  );
}
