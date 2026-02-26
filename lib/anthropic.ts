import Anthropic from '@anthropic-ai/sdk';
import type { Theme } from './supabase';

const VALID_THEMES: Theme[] = [
  'Transportation Safety',
  'Green Space',
  'Housing',
  'Noise & Pollution',
  'Public Safety',
  'Community Services',
  'Infrastructure',
  'Other',
];

const SYSTEM_PROMPT = `You are a civic issue classifier. Given a resident's comment, respond with exactly one of the following theme labels — nothing else, no punctuation, no explanation:

Transportation Safety
Green Space
Housing
Noise & Pollution
Public Safety
Community Services
Infrastructure
Other

Choose the most relevant theme. If nothing fits, respond with: Other`;

// Lazy singleton — initialised on first call so any missing-key error is thrown
// inside classifyComment where the route's try/catch can catch it.
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function classifyComment(commentText: string): Promise<Theme> {
  const client = getClient();

  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 16,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: commentText }],
  });

  // Explicit type predicate so TypeScript narrows correctly inside .map()
  const raw = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  const matched = VALID_THEMES.find(
    (theme) => theme.toLowerCase() === raw.toLowerCase(),
  );

  return matched ?? 'Other';
}