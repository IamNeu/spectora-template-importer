import { parseSpectoraExport } from '@/lib/parser'
import { importTemplate } from '@/lib/import'

export async function POST(request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')
        if (!file) {
            return Response.json({ error: 'No file was uploaded.' }, { status: 400 })
        }
        const buffer = Buffer.from(await file.arrayBuffer())
        const parsed = parseSpectoraExport(buffer, file.name)
        const result = await importTemplate(parsed, file.name, buffer.length)
        return Response.json(result)
    } catch (e) {
        return Response.json({ error: e.message }, { status: 400 })
    }
}