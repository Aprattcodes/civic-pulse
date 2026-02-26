import { createClient } from '@supabase/supabase-js';

export type Theme =
  | 'Transportation Safety'
  | 'Green Space'
  | 'Housing'
  | 'Noise & Pollution'
  | 'Public Safety'
  | 'Community Services'
  | 'Infrastructure'
  | 'Other';

export interface Comment {
  id: string;
  created_at: string;
  comment_text: string;
  theme: Theme;
  latitude: number;
  longitude: number;
  zip_code: string;
  upvotes: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);