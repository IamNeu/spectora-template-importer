import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'

const options = { auth: { persistSession: false } }

// Node 20 has no global WebSocket, and supabase-js builds a realtime client on
// startup whether or not we use it. Supply ws in that case. Vercel runs Node 22,
// where WebSocket is built in, so this branch is skipped in production.
if (typeof WebSocket === 'undefined') {
  try {
    const require = createRequire(import.meta.url)
    options.realtime = { transport: require('ws') }
  } catch {}
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options
)
