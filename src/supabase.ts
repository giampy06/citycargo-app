import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rudccmhlfmrbegaxrbgs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KT2Tt29GtN4-lhjTkLp5rA_ttve7sj5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);