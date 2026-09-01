import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rudccmhlfmrbegaxrbgs.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KT2Tt29GtN4-lhjTkLp5rA_ttve7sj5';

export const supabase = createClient(
  SUPABASE_URL.trim(),
  SUPABASE_ANON_KEY.trim()
);