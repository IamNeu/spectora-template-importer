import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { templateId } = await request.json()

    const { data: original, error: tErr } = await supabase
      .from('templates').select('*').eq('id', templateId).single()
    if (tErr || !original) return Response.json({ error: 'Template not found.' }, { status: 404 })

    const { data: copy, error: cErr } = await supabase
      .from('templates')
      .insert({ name: original.name + ' (copy)', source_filename: original.source_filename })
      .select().single()
    if (cErr) return Response.json({ error: cErr.message }, { status: 400 })

    const { data: sections } = await supabase
      .from('sections').select('*').eq('template_id', templateId).order('position')

    if (sections && sections.length) {
      const { data: newSections } = await supabase.from('sections').insert(
        sections.map(s => ({
          template_id: copy.id, name: s.name, position: s.position,
          source_row_index: s.source_row_index,
        }))
      ).select()

      const sectionMap = new Map()
      sections.forEach(old => {
        const match = newSections.find(n => n.position === old.position)
        if (match) sectionMap.set(old.id, match.id)
      })

      const { data: items } = await supabase
        .from('items').select('*').in('section_id', sections.map(s => s.id)).order('position')

      if (items && items.length) {
        const { data: newItems } = await supabase.from('items').insert(
          items.map(i => ({
            section_id: sectionMap.get(i.section_id), name: i.name,
            position: i.position, source_row_index: i.source_row_index,
          }))
        ).select()

        const itemMap = new Map()
        items.forEach(old => {
          const match = newItems.find(
            n => n.section_id === sectionMap.get(old.section_id) && n.position === old.position
          )
          if (match) itemMap.set(old.id, match.id)
        })

        const { data: comments } = await supabase
          .from('comments').select('*').in('item_id', items.map(i => i.id)).order('position')

        if (comments && comments.length) {
          const rows = comments.map(c => ({
            item_id: itemMap.get(c.item_id), name: c.name, body_html: c.body_html,
            comment_type: c.comment_type, severity: c.severity, answer_type: c.answer_type,
            options: c.options, position: c.position,
            source_row_index: c.source_row_index, raw_source: c.raw_source,
          }))
          for (let i = 0; i < rows.length; i += 200) {
            const { error } = await supabase.from('comments').insert(rows.slice(i, i + 200))
            if (error) return Response.json({ error: error.message }, { status: 400 })
          }
        }
      }
    }

    return Response.json({ templateId: copy.id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
