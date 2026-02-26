'use client';

import { useEffect, useRef } from 'react';
import type { Comment, Theme } from '@/lib/supabase';

// ─── Theme configuration (mirrors Map.tsx) ───────────────────────────────────

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  comment: Comment;
  onClose: () => void;
  triggerEl: HTMLButtonElement | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CommentModal({ comment, onClose, triggerEl }: Props) {
  const modalRef   = useRef<HTMLDivElement>(null);
  const closeRef   = useRef<HTMLButtonElement>(null);

  // Capture the trigger element once at mount so focus returns correctly on unmount
  const returnFocusRef = useRef(triggerEl);

  // Return focus to the marker that opened this modal when it unmounts
  useEffect(() => {
    return () => {
      returnFocusRef.current?.focus();
    };
  }, []);

  // Move focus to the close button when the modal opens
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Focus trap + Escape to close
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const getFocusable = () =>
      Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]',
        ),
      );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const elements = getFocusable();
      const first    = elements[0];
      const last     = elements[elements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const theme = comment.theme ?? 'Other';
  const color = THEME_COLOR[theme] ?? THEME_COLOR['Other'];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-20"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Community Report
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Theme badge — color + text label, never color-only */}
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-gray-700">{theme}</span>
          </div>

          {/* Comment text */}
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {comment.comment_text}
          </p>

          {/* Meta row */}
          <dl className="flex gap-6 text-sm text-gray-500 border-t border-gray-100 pt-4">
            <div>
              <dt className="sr-only">ZIP code</dt>
              <dd>
                <span aria-hidden="true" className="mr-1">📍</span>
                {comment.zip_code}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Upvotes</dt>
              <dd aria-label={`${comment.upvotes ?? 0} upvote${(comment.upvotes ?? 0) === 1 ? '' : 's'}`}>
                <span aria-hidden="true" className="mr-1">▲</span>
                {comment.upvotes ?? 0}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
