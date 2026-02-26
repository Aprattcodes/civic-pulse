'use client';

import { useCallback, useRef, useState } from 'react';
import Map, { type MapHandle } from '@/components/Map';
import SubmissionPanel from '@/components/SubmissionPanel';
import type { Comment } from '@/lib/supabase';

export default function MapContainer() {
  const mapRef = useRef<MapHandle>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setPendingLocation({ lat, lng });
  }, []);

  const handleSubmitSuccess = useCallback((comment: Comment) => {
    mapRef.current?.addMarker(comment);
    setPendingLocation(null);
  }, []);

  const handleClose = useCallback(() => {
    setPendingLocation(null);
  }, []);

  return (
    <div className="relative w-full h-screen">
      <Map
        ref={mapRef}
        onLocationSelect={handleLocationSelect}
        pendingLocation={pendingLocation}
      />
      {pendingLocation && (
        <SubmissionPanel
          location={pendingLocation}
          onSubmitSuccess={handleSubmitSuccess}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
