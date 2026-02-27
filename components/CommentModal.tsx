'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase, type Comment, type Theme } from '@/lib/supabase';

const UPVOTED_KEY = 'civic-pulse-upvoted';

function getUpvotedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(UPVOTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistUpvotedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(UPVOTED_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage unavailable — silently continue
  }
}

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
  onUpvoteSuccess: (commentId: string, newCount: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CommentModal({ comment, onClose, triggerEl, onUpvoteSuccess }: Props) {
  const modalRef   = useRef<HTMLDivElement>(null);
  const closeRef   = useRef<HTMLButtonElement>(null);

  const [upvoteCount, setUpvoteCount] = useState(comment.upvotes ?? 0);
  const [hasVoted, setHasVoted]       = useState(() => getUpvotedIds().has(comment.id));
  const [isUpvoting, setIsUpvoting]   = useState(false);

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

  async function handleUpvote() {
    if (hasVoted || isUpvoting) return;

    const nextCount = upvoteCount + 1;

    // Optimistic update
    setUpvoteCount(nextCount);
    setHasVoted(true);
    setIsUpvoting(true);

    // Persist to localStorage immediately so a page refresh keeps the voted state
    const ids = getUpvotedIds();
    ids.add(comment.id);
    persistUpvotedIds(ids);

    const { error } = await supabase
      .from('comments')
      .update({ upvotes: nextCount })
      .eq('id', comment.id);

    if (error) {
      console.error('[CommentModal] Upvote failed:', error.message);
      // Roll back optimistic update
      setUpvoteCount(upvoteCount);
      setHasVoted(false);
      ids.delete(comment.id);
      persistUpvotedIds(ids);
    } else {
      onUpvoteSuccess(comment.id, nextCount);
    }

    setIsUpvoting(false);
  }

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
              <dd>
                <button
                  onClick={handleUpvote}
                  disabled={hasVoted || isUpvoting}
                  aria-label={
                    hasVoted
                      ? `Already upvoted, currently ${upvoteCount} vote${upvoteCount === 1 ? '' : 's'}`
                      : `Upvote this comment, currently ${upvoteCount} vote${upvoteCount === 1 ? '' : 's'}`
                  }
                  aria-pressed={hasVoted}
                  className={[
                    'flex items-center gap-1 rounded px-2 py-0.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    hasVoted
                      ? 'text-blue-600 bg-blue-50 cursor-default'
                      : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer',
                  ].join(' ')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 flex-shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 0 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-1.341 5.974C17.153 16.323 16.072 17 14.9 17h-3.192a3 3 0 0 1-1.341-.317l-2.734-1.366A3 3 0 0 0 6.292 15H5V8h.963c.685 0 1.258-.483 1.612-1.068a4.011 4.011 0 0 1 2.166-1.73c.432-.143.853-.386 1.011-.814.16-.432.248-.9.248-1.388Z" />
                  </svg>
                  {upvoteCount}
                </button>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
