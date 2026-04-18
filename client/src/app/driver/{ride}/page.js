'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function DriverRideDetail() {
  const router = useRouter();
  const params = useParams();
  const rideId = params.ride;
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'DRIVER') { router.push('/auth/login'); return; }
    fetchRide();
    const interval = setInterval(fetchRide, 8000);
    return () => clearInterval(interval);
  }, [rideId]);

  const fetchRide = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides/${rideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRide(data.data);
    } catch {} finally { setLoading(false); }
  };

  const startRide = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides/${rideId}/start`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRide();
    } catch {} finally { setActionLoading(false); }
  };

  const completeRide = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rides/${rideId}/complete`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      });
      await fetchRide();
      setTimeout(() => router.push('/driver'), 2000);
    } catch {} finally { setActionLoading(false); }
  };

  const statusConfig = {
    MATCHING:    { color: 'text-yellow-400', bg: 'bg-yellow-900/20', label: 'Finding You...' },
    ASSIGNED:    { color: 'text-blue-400', bg: 'bg-blue-900/20', label: 'Head to Pickup' },
    PICKUP:      { color: 'text-purple-400', bg: 'bg-purple-900/20', label: 'Arrived at Pickup' },
    IN_PROGRESS: { color: 'text-green-400', bg: 'bg-green-900/20', label: 'Ride In Progress' },
    COMPLETED:   { color: 'text-gray-400', bg: 'bg-gray-700', label: 'Completed' },
    PAID:        { color: 'text-emerald-400', bg: 'bg-emerald-900/20', label: 'Payment Received' },
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-lg animate-pulse">Loading ride...</div>
    </div>
  );

  if (!ride) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-gray-400">Ride not found</p>
        <button onClick={() => router.push('/driver')} className="mt-4 text-blue-400 hover:text-blue-300">← Back to Dashboard</button>
      </div>
    </div>
  );

  const cfg = statusConfig[ride.status] || { color: 'text-gray-400', bg: 'bg-gray-700', label: ride.status };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex items-center gap-3 border-b border-gray-700">
        <button onClick={() => router.push('/driver')} className="text-gray-400 hover:text-white text-xl">←</button>
        <h1 className="text-xl font-bold">Ride Details</h1>
        <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </header>

      <main className="max-w-lg mx-auto p-6 space-y-4">
        {/* Ride Info */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Ride ID</span>
            <span className="font-mono text-xs text-gray-300">{ride.id?.slice(0, 8)}...</span>
          </div>

          {/* Route */}
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 w-4 h-4 rounded-full bg-green-500 flex-shrink-0"></div>
              <div>
                <p className="text-xs text-gray-400">Pickup</p>
                <p className="font-medium">{ride.pickupLat?.toFixed(5)}, {ride.pickupLng?.toFixed(5)}</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 w-4 h-4 rounded-full bg-red-500 flex-shrink-0"></div>
              <div>
                <p className="text-xs text-gray-400">Dropoff</p>
                <p className="font-medium">{ride.dropoffLat?.toFixed(5)}, {ride.dropoffLng?.toFixed(5)}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-700">
            <div className="text-center">
              <p className="text-xs text-gray-400">ETA</p>
              <p className="font-bold text-blue-400">{ride.etaMinutes || '--'} min</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Fare</p>
              <p className="font-bold text-yellow-400">{ride.estimatedPrice?.toLocaleString() || '--'} VND</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Type</p>
              <p className="font-bold text-purple-400">{ride.vehicleType || 'CAR'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {ride.status === 'ASSIGNED' && (
            <button onClick={startRide} disabled={actionLoading}
              className="w-full bg-blue-600 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {actionLoading ? 'Starting...' : '🚀 Start Ride'}
            </button>
          )}
          {ride.status === 'IN_PROGRESS' && (
            <button onClick={completeRide} disabled={actionLoading}
              className="w-full bg-green-600 py-4 rounded-2xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 transition">
              {actionLoading ? 'Completing...' : '✅ Complete Ride'}
            </button>
          )}
          {(ride.status === 'COMPLETED' || ride.status === 'PAID') && (
            <div className="bg-gray-800 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-bold text-green-400">Ride Completed!</p>
              {ride.status === 'PAID' && <p className="text-sm text-gray-400 mt-1">Payment received</p>}
              <button onClick={() => router.push('/driver')} className="mt-4 w-full bg-gray-700 py-3 rounded-xl font-medium hover:bg-gray-600">
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
