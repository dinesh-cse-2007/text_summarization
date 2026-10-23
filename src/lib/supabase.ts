import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SummaryRecord {
  id: string;
  title: string;
  original_text: string;
  summary_text: string;
  summary_ratio: number;
  word_count_original: number;
  word_count_summary: number;
  created_at: string;
}
