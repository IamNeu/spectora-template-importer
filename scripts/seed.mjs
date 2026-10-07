import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const { parseSpectoraExport } = await
import ('../lib/parser.js')
const { importTemplate } = await
import ('../lib/import.js')

const path = 'spectora-export/internachi-residential-2026-09-14.xls'
const buf = fs.readFileSync(path)
const parsed = parseSpectoraExport(buf, path.split('/').pop())
const result = await importTemplate(parsed, path.split('/').pop(), buf.length)
console.log('imported:', result.counts, 'issues:', result.issues.length)
console.log('template id:', result.templateId)