'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase, type Comment } from '@/lib/supabase';

interface Props {
  location: { lat: number; lng: number };
  onSubmitSuccess: (comment: Comment) => void;
  onClose: () => void;
}

export default function SubmissionPanel({ location, onSubmitSuccess, onClose }: Props) {
  const [commentText, setCommentText] = useState('');
  const [zipCode, setZipCode]         = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const panelRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Move focus into the panel when it opens
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Focus trap + Escape to close
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex="0"]',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedComment = commentText.trim();
    const trimmedZip     = zipCode.trim();

    if (!trimmedComment) {
      setError('Please enter a comment before submitting.');
      return;
    }

    if (!/^\d{5}$/.test(trimmedZip)) {
      setError('Please enter a valid 5-digit ZIP code.');
      return;
    }

    setLoading(true);

    try {
      // Step 1 — classify the comment text
      const classifyRes = await fetch('/api/classify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ comment_text: trimmedComment }),
      });

      if (!classifyRes.ok) {
        throw new Error('Classification failed. Please try again.');
      }

      const { theme } = await classifyRes.json();

      // Step 2 — persist to Supabase
      const { data, error: dbError } = await supabase
        .from('comments')
        .insert({
          comment_text: trimmedComment,
          zip_code:     trimmedZip,
          latitude:     location.lat,
          longitude:    location.lng,
          theme,
          upvotes:      0,
        })
        .select()
        .single();

      if (dbError) {
        throw new Error('Failed to save your comment. Please try again.');
      }

      onSubmitSuccess(data as Comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="panel-heading"
      aria-modal="true"
      className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl border-l border-gray-200 flex flex-col z-10"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2
          id="panel-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Report an Issue
        </h2>
        <button
          onClick={onClose}
          aria-label="Close form"
          className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* ── ARIA live region — always in the DOM so announcements are reliable ── */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          error
            ? 'mx-6 mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700'
            : 'sr-only'
        }
      >
        {error}
      </div>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5 px-6 py-5 flex-1 overflow-y-auto"
      >
        {/* Comment */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="comment-text"
            className="text-sm font-medium text-gray-700"
          >
            Describe the issue{' '}
            <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <textarea
            ref={textareaRef}
            id="comment-text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="What's happening here?"
            aria-required="true"
            aria-describedby="comment-count"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span id="comment-count" className="text-xs text-gray-400 text-right">
            {commentText.length} / 2000
          </span>
        </div>

        {/* ZIP code */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="zip-code"
            className="text-sm font-medium text-gray-700"
          >
            ZIP code{' '}
            <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="zip-code"
            type="text"
            inputMode="numeric"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            maxLength={5}
            placeholder="12345"
            aria-required="true"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Pin coordinates — informational */}
        <p className="text-xs text-gray-400">
          Pin location: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </p>

        {/* Submit */}
        <div className="mt-auto">
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
