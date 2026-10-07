'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

function Field({ value, onSave, className }) {
  const [v, setV] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dirty = v !== (value ?? '')

  async function save() {
    setSaving(true)
    await onSave(v)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <span className="inline-flex items-center gap-2 flex-1 min-w-0">
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        className={className + ' flex-1 min-w-0 bg-transparent rounded px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white focus:outline-none'}
      />
      {dirty && (
        <button onClick={save} disabled={saving}
          className="shrink-0 text-xs bg-blue-600 text-white px-2 py-1 rounded">
          {saving ? 'Saving...' : 'Save'}
        </button>
      )}
      {saved && <span className="shrink-0 text-xs text-green-700">Saved</span>}
    </span>
  )
}

function Toggle({ open, onClick }) {
  return (
    <button onClick={onClick}
      className="shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700">
      {open ? '\u2212' : '+'}
    </button>
  )
}

export default function TemplateEditor({ template, tree, counts, issues }) {
  const [open, setOpen] = useState({})
  const [copying, setCopying] = useState(false)
  const router = useRouter()

  async function patch(table, id, field, value) {
    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, field, value }),
    })
    router.refresh()
  }

  async function duplicate() {
    setCopying(true)
    const res = await fetch('/api/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id }),
    })
    const json = await res.json()
    setCopying(false)
    if (json.templateId) router.push('/templates/' + json.templateId)
  }

  return (
    <div>
      <div className="flex items-start justify-between mt-4 mb-1 gap-4">
        <Field value={template.name} className="text-2xl font-semibold tracking-tight"
          onSave={v => patch('templates', template.id, 'name', v)} />
        <button onClick={duplicate} disabled={copying}
          className="shrink-0 border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">
          {copying ? 'Copying...' : 'Duplicate template'}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-5 px-2">
        {counts.sections} sections &middot; {counts.items} items &middot; {counts.comments} comments
        {template.source_filename ? ' \u00b7 from ' + template.source_filename : ''}
      </p>

      {issues.length > 0 && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded">
          <strong className="text-sm">{issues.length} import issue(s)</strong>
          <ul className="mt-1 text-sm list-disc pl-5">
            {issues.map(x => (
              <li key={x.id}>{x.row_index ? 'Row ' + x.row_index + ': ' : ''}{x.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        {tree.map(s => (
          <div key={s.id} className="py-2 px-3">
            <div className="flex items-center gap-1">
              <Toggle open={open[s.id]} onClick={() => setOpen(o => ({ ...o, [s.id]: !o[s.id] }))} />
              <Field value={s.name} className="text-base font-semibold text-gray-900"
                onSave={v => patch('sections', s.id, 'name', v)} />
              <span className="shrink-0 text-xs text-gray-400 pr-1">{s.items.length}</span>
            </div>

            {open[s.id] && (
              <div className="ml-3 pl-4 mt-1 border-l border-gray-200">
                {s.items.map(i => (
                  <div key={i.id} className="py-1">
                    <div className="flex items-center gap-1">
                      <Toggle open={open[i.id]} onClick={() => setOpen(o => ({ ...o, [i.id]: !o[i.id] }))} />
                      <Field value={i.name} className="text-sm font-medium text-gray-800"
                        onSave={v => patch('items', i.id, 'name', v)} />
                      <span className="shrink-0 text-xs text-gray-400 pr-1">{i.comments.length}</span>
                    </div>

                    {open[i.id] && (
                      <div className="ml-3 pl-4 mt-1 border-l border-gray-200 space-y-3">
                        {i.comments.map(c => (
                          <div key={c.id} className="py-1">
                            <Field value={c.name} className="text-sm text-gray-700"
                              onSave={v => patch('comments', c.id, 'name', v)} />
                            <div className="text-xs text-gray-400 px-2 mt-0.5">
                              {[c.comment_type, c.answer_type].filter(Boolean).join(' \u00b7 ')}
                              {' \u00b7 source row '}{c.source_row_index}
                            </div>
                            <CommentBody comment={c} onSave={v => patch('comments', c.id, 'body_html', v)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CommentBody({ comment, onSave }) {
  const [v, setV] = useState(comment.body_html ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dirty = v !== (comment.body_html ?? '')
  const empty = !comment.body_html

  return (
    <div className="mt-1 px-2">
      <textarea
        value={v}
        onChange={e => setV(e.target.value)}
        rows={empty ? 1 : 3}
        placeholder={empty ? 'No comment text in the export' : ''}
        className="w-full rounded px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none"
      />
      {dirty && (
        <button onClick={async () => { setSaving(true); await onSave(v); setSaving(false); setSaved(true) }}
          disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-1 rounded mt-1">
          {saving ? 'Saving...' : 'Save comment'}
        </button>
      )}
      {saved && <span className="text-xs text-green-700 ml-2">Saved</span>}
    </div>
  )
}
