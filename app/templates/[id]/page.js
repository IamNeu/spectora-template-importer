import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TemplateEditor from './editor'

export const dynamic = 'force-dynamic'

export default async function TemplatePage({ params }) {
  const { id } = await params

  const { data: template } = await supabase
    .from('templates').select('*').eq('id', id).single()

  if (!template) {
    return <main className="max-w-4xl mx-auto p-8">Template not found.</main>
  }

  const { data: sections } = await supabase
    .from('sections').select('*').eq('template_id', id).order('position')

  const sectionIds = (sections || []).map(s => s.id)
  const { data: items } = sectionIds.length
    ? await supabase.from('items').select('*').in('section_id', sectionIds).order('position')
    : { data: [] }

  const itemIds = (items || []).map(i => i.id)
  const { data: comments } = itemIds.length
    ? await supabase.from('comments').select('*').in('item_id', itemIds).order('position')
    : { data: [] }

  const { data: run } = await supabase
    .from('import_runs').select('*').eq('template_id', id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const { data: issues } = run
    ? await supabase.from('import_issues').select('*').eq('import_run_id', run.id)
    : { data: [] }

  const tree = (sections || []).map(s => ({
    ...s,
    items: (items || []).filter(i => i.section_id === s.id).map(i => ({
      ...i,
      comments: (comments || []).filter(c => c.item_id === i.id),
    })),
  }))

  return (
    <main className="max-w-4xl mx-auto p-8">
      <Link href="/" className="text-sm text-blue-700">&larr; All templates</Link>
      <TemplateEditor
        template={template}
        tree={tree}
        counts={{
          sections: (sections || []).length,
          items: (items || []).length,
          comments: (comments || []).length,
        }}
        issues={issues || []}
      />
    </main>
  )
}
