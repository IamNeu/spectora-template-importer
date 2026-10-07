import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Upload from './upload'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data: templates } = await supabase
    .from('templates')
    .select('id, name, source_filename, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-1">Template importer</h1>
      <p className="text-gray-600 mb-6">Import a Spectora HTML-text export.</p>

      <Upload />

      <h2 className="text-lg font-medium mt-10 mb-3">Templates</h2>
      <ul className="divide-y border rounded">
        {(templates || []).map(t => (
          <li key={t.id} className="p-3 hover:bg-gray-50">
            <Link href={`/templates/${t.id}`} className="font-medium text-blue-700">{t.name}</Link>
            <div className="text-sm text-gray-500">{t.source_filename}</div>
          </li>
        ))}
        {(!templates || templates.length === 0) && (
          <li className="p-3 text-gray-500">No templates yet.</li>
        )}
      </ul>
    </main>
  )
}
