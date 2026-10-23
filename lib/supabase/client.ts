import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oaockvuchphqhfblyoke.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_PinS_z1ogNrDS7WCEPG6Zw_9pvGFXaN';

export function getSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
