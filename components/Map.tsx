'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase, type Comment, type Theme } from '@/lib/supabase';

// ─── Theme configuration ────────────────────────────────────────────────────

const THEME_COLOR: Record<Theme, string> = {
  'Transportation Safety': '#3b82f6', // blue-500
  'Green Space':           '#22c55e', // green-500
  'Housing':               '#f97316', // orange-500
  'Noise & Pollution':     '#eab308', // yellow-500
  'Public Safety':         '#ef4444', // red-500
  'Community Services':    '#a855f7', // purple-500
  'Infrastructure':        '#6b7280', // gray-500
  'Other':                 '#14b8a6', // teal-500
};

// Single letter shown inside marker so color is never the only differentiator
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
  const theme = comment.theme ?? 'Other';
  const color   = THEME_COLOR[theme]   ?? THEME_COLOR['Other'];
  const initial = THEME_INITIAL[theme] ?? 'O';
  const label   = `${theme}: ${truncate(comment.comment_text, 80)}`;

  const el = document.createElement('button');
  el.className = 'civic-marker';
  el.setAttribute('aria-label', label);
  el.setAttribute('title', label);
  el.textContent = initial;
  // Only the dynamic colour is set here; all other styles live in globals.css
  el.style.setProperty('--marker-color', color);

  return el;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('[Map] Missing NEXT_PUBLIC_MAPBOX_TOKEN');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:     'mapbox://styles/mapbox/streets-v12',
      center:    [-98.5795, 39.8283], // geographic centre of the contiguous US
      zoom:      4,
    });

    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      'top-right'
    );

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

        new mapboxgl.Marker({ element: el })
          .setLngLat([comment.longitude, comment.latitude])
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen"
      role="application"
      aria-label="Civic issues map"
    />
  );
}
