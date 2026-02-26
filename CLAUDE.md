# Civic Pulse — CLAUDE.md

## Project Overview
Crowdsourced civic engagement map where residents drop pins, submit freeform 
comments, and engage with neighbors' concerns. LLM classifies submissions 
into themes automatically.

## Tech Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS
- Supabase (database + realtime)
- Mapbox GL JS
- Anthropic Claude API (theme classification)
- Vercel (deployment)

## Common Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint

## Architecture
- `app/` — Next.js App Router pages
- `components/` — React components
- `lib/supabase.ts` — Supabase client
- `lib/anthropic.ts` — Claude API client
- `app/api/` — API routes (theme classification)

## Code Style
- Always use functional components with hooks
- TypeScript strict mode — no `any` types
- Tailwind for all styling — no inline styles
- WCAG 2.2 AA accessibility required on all components
- Every interactive element must be keyboard navigable
- ARIA labels required on all map markers and form elements

## Database Schema
comments table: id, created_at, comment_text, theme, latitude, 
longitude, zip_code, upvotes

## Accessibility Requirements
- Color is never the only differentiator
- All map markers need ARIA labels
- Form errors announced via live regions
- Full keyboard navigation on all interactions