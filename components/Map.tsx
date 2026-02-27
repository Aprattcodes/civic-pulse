'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { supabase, type Comment, type Theme } from '@/lib/supabase';

// ─── Theme configuration ─────────────────────────────────────────────────────

const THEME_COLOR: Record<Theme, string> = {
  'Transportation Safety': '#3b82f6',
  'Green Space':           '#22c55e',
  'Housing':               '#f97316',
  'Noise & Pollution':     '#eab308',
  'Public Safety':         '#ef4444',
  'Community Services':    '#a855f7',
  'Infrastructure':        '#6b7280',
  'Other':                 '#14b8a6',
};

const THEME_INITIAL: Record<Theme, string> = {
  'Transportation Safety': 'T',
  'Green Space':           'G',
  'Housing':               'H',
  'Noise & Pollution':     'N',
  'Public Safety':         'P',
  'Community Services':    'C',
  'Infrastructure':        'I',
  'Other':                 'O',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…';
}

function buildMarkerElement(comment: Comment): HTMLButtonElement {
  const theme   = comment.theme ?? 'Other';
  const color   = THEME_COLOR[theme]   ?? THEME_COLOR['Other'];
  const initial = THEME_INITIAL[theme] ?? 'O';
  const label   = `${theme}: ${truncate(comment.comment_text, 80)}`;

  const el = document.createElement('button');
  el.className = 'civic-marker';
  el.setAttribute('aria-label', label);
  // No title attribute — hover tooltip replaced by click modal
  el.textContent = initial;
  el.style.setProperty('--marker-color', color);
  return el;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MapHandle {
  addMarker: (comment: Comment) => void;
}

interface MapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  pendingLocation: { lat: number; lng: number } | null;
  onMarkerClick: (comment: Comment, el: HTMLButtonElement) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const Map = forwardRef<MapHandle, MapProps>(function Map(
  { onLocationSelect, pendingLocation, onMarkerClick },
  ref,
) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<mapboxgl.Map | null>(null);
  const pendingMarkerRef   = useRef<mapboxgl.Marker | null>(null);
  const locallyAddedIds    = useRef<Set<string>>(new Set());

  // Keep callback refs current so map event handlers never capture stale closures
  const onLocationSelectRef = useRef(onLocationSelect);
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  // Attach click listener to a marker element, calling onMarkerClick with comment + element
  function attachMarkerClick(el: HTMLButtonElement, comment: Comment) {
    el.addEventListener('click', (e) => {
      // Stop propagation so the event doesn't bubble to the map container.
      // map.on('click') only fires for canvas clicks, but this is belt-and-suspenders.
      e.stopPropagation();
      onMarkerClickRef.current(comment, el);
    });
  }

  // Expose addMarker imperatively so MapContainer can push a new marker after save
  useImperativeHandle(ref, () => ({
    addMarker(comment: Comment) {
      const map = mapRef.current;
      if (!map) return;
      // Record this ID so the realtime subscription skips the duplicate
      locallyAddedIds.current.add(comment.id);
      const el = buildMarkerElement(comment);
      attachMarkerClick(el, comment);
      new mapboxgl.Marker({ element: el })
        .setLngLat([comment.longitude, comment.latitude])
        .addTo(map);
    },
  }));

  // ── Map initialisation (runs once) ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('[Map] Missing NEXT_PUBLIC_MAPBOX_TOKEN');
      return;
    }

    const map = new mapboxgl.Map({
      accessToken: token,
      container:   containerRef.current,
      style:        'mapbox://styles/mapbox/streets-v12',
      center:       [-98.5795, 39.8283],
      zoom:         4,
    });

    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      'top-right',
    );

    // Geocoder — positioned top-left, keyboard accessible by default
    map.addControl(
      new MapboxGeocoder({
        accessToken: token,
        mapboxgl,
        placeholder: 'Search for a location…',
      }),
      'top-left',
    );

    // Drop a pin wherever the user clicks the map canvas
    map.on('click', (e) => {
      onLocationSelectRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    // Communicate clickability to sighted users via cursor
    map.on('mousemove', () => {
      map.getCanvas().style.cursor = 'crosshair';
    });

    // Load existing comments and render permanent markers
    map.on('load', async () => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*');

      if (error) {
        console.error('[Map] Failed to load comments:', error.message);
        return;
      }

      (comments as Comment[]).forEach((comment) => {
        const el = buildMarkerElement(comment);
        attachMarkerClick(el, comment);
        new mapboxgl.Marker({ element: el })
          .setLngLat([comment.longitude, comment.latitude])
          .addTo(map);
      });
    });

    // Real-time: add a marker whenever any client inserts a new comment
    const channel = supabase
      .channel('comments-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          const newComment = payload.new as Comment;
          // Skip if this client already added the marker via addMarker()
          if (locallyAddedIds.current.has(newComment.id)) return;
          const el = buildMarkerElement(newComment);
          attachMarkerClick(el, newComment);
          new mapboxgl.Marker({ element: el })
            .setLngLat([newComment.longitude, newComment.latitude])
            .addTo(map);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Pending marker (synced to pendingLocation prop) ────────────────────────
  useEffect(() => {
    // Always remove the previous pending marker first
    pendingMarkerRef.current?.remove();
    pendingMarkerRef.current = null;

    const map = mapRef.current;
    if (!pendingLocation || !map) return;

    const el = document.createElement('div');
    el.className = 'civic-marker-pending';
    el.setAttribute('aria-hidden', 'true'); // decorative — the form panel is the interactive surface
    el.textContent = '?';

    pendingMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([pendingLocation.lng, pendingLocation.lat])
      .addTo(map);
  }, [pendingLocation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      role="application"
      aria-label="Civic issues map. Click anywhere to report an issue."
    />
  );
});

export default Map;
