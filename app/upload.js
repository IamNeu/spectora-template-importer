'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Upload() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const router = useRouter()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setBusy(true); setError(null); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/import', { method: 'POST', body: fd })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) { setError(json.error); return }
    setResult(json)
    router.refresh()
  }

  return (
    <div className="border rounded p-4">
      <input type="file" onChange={handleFile} disabled={busy} accept=".xls,.xlsx" className="block" />
      {busy && <p className="mt-2 text-gray-600">Importing...</p>}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-800">
          <strong>Import failed.</strong> {error}
        </div>
      )}
      {result && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
          <strong>Imported.</strong> {result.counts.sections} sections, {result.counts.items} items, {result.counts.comments} comments from {result.counts.total_rows} rows.
          {result.issues.length > 0 && (
            <ul className="mt-2 text-sm list-disc pl-5">
              {result.issues.map((x, i) => <li key={i}>{x.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
