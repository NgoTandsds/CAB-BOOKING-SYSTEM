'use client';
import { useEffect, useRef } from 'react';

export default function DriverRouteMap({ pickupLat, pickupLng, dropoffLat, dropoffLng }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Fix default icon paths for Next.js
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current).setView([pickupLat, pickupLng], 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const greenIcon = L.divIcon({
        html: '<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>',
        className: '',
        iconAnchor: [7, 7],
      });
      const redIcon = L.divIcon({
        html: '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>',
        className: '',
        iconAnchor: [7, 7],
      });

      L.marker([pickupLat, pickupLng], { icon: greenIcon }).addTo(map).bindPopup('📍 Điểm đón').openPopup();
      L.marker([dropoffLat, dropoffLng], { icon: redIcon }).addTo(map).bindPopup('🏁 Điểm đến');

      // Fetch route from OSRM (free, no API key)
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes?.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          L.polyline(coords, { color: '#2563eb', weight: 4, opacity: 0.8 }).addTo(map);
          map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
        } else {
          L.polyline([[pickupLat, pickupLng], [dropoffLat, dropoffLng]], { color: '#2563eb', weight: 3, dashArray: '6,6' }).addTo(map);
          map.fitBounds([[pickupLat, pickupLng], [dropoffLat, dropoffLng]], { padding: [40, 40] });
        }
      } catch {
        L.polyline([[pickupLat, pickupLng], [dropoffLat, dropoffLng]], { color: '#2563eb', weight: 3, dashArray: '6,6' }).addTo(map);
        map.fitBounds([[pickupLat, pickupLng], [dropoffLat, dropoffLng]], { padding: [40, 40] });
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const googleMapsUrl = `https://www.google.com/maps/dir/${pickupLat},${pickupLng}/${dropoffLat},${dropoffLng}`;

  return (
    <div className="space-y-2">
      <div ref={mapRef} style={{ height: '240px', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }} />
      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-xl font-medium transition">
        🗺️ Mở Google Maps điều hướng
      </a>
    </div>
  );
}
