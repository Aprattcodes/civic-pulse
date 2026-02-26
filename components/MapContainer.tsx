'use client';

import { useCallback, useRef, useState } from 'react';
import Map, { type MapHandle } from '@/components/Map';
import SubmissionPanel from '@/components/SubmissionPanel';
import CommentModal from '@/components/CommentModal';
import type { Comment } from '@/lib/supabase';

export default function MapContainer() {
  const mapRef = useRef<MapHandle>(null);

  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const triggerElRef = useRef<HTMLButtonElement | null>(null);

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

  const handleMarkerClick = useCallback((comment: Comment, el: HTMLButtonElement) => {
    triggerElRef.current = el;
    setSelectedComment(comment);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedComment(null);
    // Focus return is handled by CommentModal's useEffect cleanup via triggerElRef
  }, []);

  return (
    <div className="relative w-full h-screen">
      <Map
        ref={mapRef}
        onLocationSelect={handleLocationSelect}
        pendingLocation={pendingLocation}
        onMarkerClick={handleMarkerClick}
      />
      {pendingLocation && (
        <SubmissionPanel
          location={pendingLocation}
          onSubmitSuccess={handleSubmitSuccess}
          onClose={handleClose}
        />
      )}
      {selectedComment && (
        <CommentModal
          comment={selectedComment}
          onClose={handleModalClose}
          triggerEl={triggerElRef.current}
        />
      )}
    </div>
  );
}
