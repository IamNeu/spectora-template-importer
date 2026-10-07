import * as XLSX from 'xlsx'

const COL = {
    section: 'Section Name',
    item: 'Item Name',
    comment: 'Comment Name',
    text: 'Comment Text',
    type: 'Comment Type (info, limit, defect)',
    severity: 'Category (-1: Low, 0: Med, 1: High)',
    options: 'Multiple Choice Options (comma-separated)',
    answer: 'Answer Type (boolean, checkbox, date, number, range, text)',
    order: 'Order (w/i item)',
}

// Trap 4: the export does not decode HTML entities.
function decodeEntities(s) {
    if (s == null) return ''
    return String(s)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\u00a0/g, ' ')
        .trim()
}

export function parseSpectoraExport(buffer, filename) {
    const issues = []
    let wb
    try {
        // Trap 1: file is named .xls but is really xlsx. Read the bytes, not the name.
        wb = XLSX.read(buffer, { type: 'buffer' })
    } catch (e) {
        throw new Error('Could not read this file as a spreadsheet: ' + e.message)
    }

    const sheetName = wb.SheetNames[0]
    if (!sheetName) throw new Error('The workbook has no sheets.')
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null })
    if (rows.length === 0) throw new Error('The first sheet has no data rows.')

    const headers = Object.keys(rows[0])
    for (const required of[COL.section, COL.item, COL.comment]) {
        if (!headers.includes(required)) {
            throw new Error(
                `This does not look like a Spectora HTML-text export: missing column "${required}".`
            )
        }
    }

    // Traps 2 and 3: order lives only in row order, so walk rows in file order
    // and record first-appearance position. Never sort, never key by name alone.
    const sections = []
    const sectionIndex = new Map()
    const itemIndex = new Map()
    let commentCount = 0

    rows.forEach((row, i) => {
        const rowNum = i + 2 // +1 for header, +1 for 1-based spreadsheet rows
        const sectionName = decodeEntities(row[COL.section])
        const itemName = decodeEntities(row[COL.item])
        const commentName = decodeEntities(row[COL.comment])

        if (!sectionName || !itemName) {
            issues.push({
                row_index: rowNum,
                issue_type: 'missing_hierarchy',
                severity: 'error',
                message: 'Row skipped: it has no section or item name.',
                detail: row,
            })
            return
        }
        if (!commentName) {
            issues.push({
                row_index: rowNum,
                issue_type: 'missing_comment_name',
                severity: 'warning',
                message: 'Row skipped: it has a section and item but no comment name.',
                detail: row,
            })
            return
        }

        let section = sectionIndex.get(sectionName)
        if (!section) {
            section = { name: sectionName, position: sections.length, source_row_index: rowNum, items: [] }
            sectionIndex.set(sectionName, section)
            sections.push(section)
        }

        const itemKey = sectionName + '||' + itemName
        let item = itemIndex.get(itemKey)
        if (!item) {
            item = { name: itemName, position: section.items.length, source_row_index: rowNum, comments: [] }
            itemIndex.set(itemKey, item)
            section.items.push(item)
        }

        // Trap 5: 83 comments have a name but no body. They are real content.
        const body = row[COL.text] == null ? null : String(row[COL.text])

        // Trap 3: the Order column has gaps and duplicates, so it cannot stand
        // alone. Keep it, but position by arrival order within the item.
        const declaredOrder = row[COL.order]
        if (declaredOrder == null) {
            issues.push({
                row_index: rowNum,
                issue_type: 'missing_order',
                severity: 'info',
                message: `"${commentName}" had no order value; kept in file order.`,
                detail: null,
            })
        }

        const rawOptions = row[COL.options]
        item.comments.push({
            name: commentName,
            body_html: body,
            comment_type: row[COL.type] ? String(row[COL.type]) : null,
            severity: row[COL.severity] == null ? null : Number(row[COL.severity]),
            answer_type: row[COL.answer] ? String(row[COL.answer]) : null,
            options: rawOptions ? String(rawOptions).split(',').map(s => s.trim()).filter(Boolean) : null,
            position: item.comments.length,
            source_row_index: rowNum,
            raw_source: row,
        })
        commentCount++
    })

    // Photo columns exist in the format but are not imported. Say so rather
    // than letting the user assume photos came across.
    const photoCols = headers.filter(h => /^Default Photo \d+$/.test(h))
    const rowsWithPhotos = rows.filter(r => photoCols.some(c => r[c] != null)).length
    if (rowsWithPhotos > 0) {
        issues.push({
            row_index: null,
            issue_type: 'unsupported_field',
            severity: 'warning',
            message: `${rowsWithPhotos} row(s) have default photos. Photos are not imported by this version.`,
            detail: null,
        })
    }

    return {
        templateName: filename.replace(/\.(xlsx?|csv)$/i, '').replace(/[-_]/g, ' ').trim(),
        sections,
        issues,
        counts: {
            total_rows: rows.length,
            sections: sections.length,
            items: sections.reduce((n, s) => n + s.items.length, 0),
            comments: commentCount,
        },
    }
}