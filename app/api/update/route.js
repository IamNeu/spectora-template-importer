import { supabase } from '@/lib/supabase'

// Only these fields may be written, so a crafted request cannot touch
// source_row_index, raw_source, or anything else that records provenance.
const ALLOWED = {
  templates: ['name'],
  sections: ['name'],
  items: ['name'],
  comments: ['name', 'body_html'],
}

export async function POST(request) {
  try {
    const { table, id, field, value } = await request.json()
    if (!ALLOWED[table] || !ALLOWED[table].includes(field)) {
      return Response.json({ error: 'That field cannot be edited.' }, { status: 400 })
    }
    const patch = { [field]: value }
    if (table === 'templates' || table === 'comments') patch.updated_at = new Date().toISOString()

    const { error } = await supabase.from(table).update(patch).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
