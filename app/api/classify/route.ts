import { NextRequest, NextResponse } from 'next/server';
import { classifyComment } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('comment_text' in body) ||
    typeof (body as Record<string, unknown>).comment_text !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Request body must include a "comment_text" string field.' },
      { status: 422 }
    );
  }

  const commentText = (body as { comment_text: string }).comment_text.trim();

  if (commentText.length === 0) {
    return NextResponse.json(
      { error: '"comment_text" must not be empty.' },
      { status: 422 }
    );
  }

  if (commentText.length > 2000) {
    return NextResponse.json(
      { error: '"comment_text" must be 2000 characters or fewer.' },
      { status: 422 }
    );
  }

  try {
    const theme = await classifyComment(commentText);
    return NextResponse.json({ theme });
  } catch (err) {
    console.error('[/api/classify] Anthropic error:', err);
    return NextResponse.json(
      { error: 'Classification failed. Please try again.' },
      { status: 502 }
    );
  }
}
