import fs from 'fs'
import { parseSpectoraExport } from '../lib/parser.js'

const path = 'spectora-export/internachi-residential-2026-09-14.xls'
const result = parseSpectoraExport(fs.readFileSync(path), path.split('/').pop())

console.log('counts:', result.counts)
console.log('issues:', result.issues.length)
console.log('first 3 sections:', result.sections.slice(0, 3).map(s => `${s.position}: ${s.name} (${s.items.length} items)`))
console.log('entity check:', result.sections.map(s => s.name).find(n => n.includes('Basement')))