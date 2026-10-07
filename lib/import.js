import { supabase } from './supabase.js'

export async function importTemplate(parsed, filename, fileSize) {
    const { data: run, error: runErr } = await supabase
        .from('import_runs')
        .insert({
            source_filename: filename,
            file_size_bytes: fileSize,
            status: 'running',
            total_rows: parsed.counts.total_rows,
        })
        .select()
        .single()
    if (runErr) throw new Error('Could not start import run: ' + runErr.message)

    try {
        const { data: template, error: tErr } = await supabase
            .from('templates')
            .insert({ name: parsed.templateName, source_filename: filename })
            .select()
            .single()
        if (tErr) throw new Error('Could not create template: ' + tErr.message)

        const sectionRows = parsed.sections.map(s => ({
            template_id: template.id,
            name: s.name,
            position: s.position,
            source_row_index: s.source_row_index,
        }))
        const { data: sections, error: sErr } = await supabase
            .from('sections').insert(sectionRows).select()
        if (sErr) throw new Error('Could not create sections: ' + sErr.message)

        const byPosition = new Map(sections.map(s => [s.position, s.id]))

        const itemRows = []
        parsed.sections.forEach(s => {
            s.items.forEach(it => {
                itemRows.push({
                    section_id: byPosition.get(s.position),
                    name: it.name,
                    position: it.position,
                    source_row_index: it.source_row_index,
                })
            })
        })
        const { data: items, error: iErr } = await supabase
            .from('items').insert(itemRows).select()
        if (iErr) throw new Error('Could not create items: ' + iErr.message)

        const itemKey = new Map()
        items.forEach(it => itemKey.set(it.section_id + '||' + it.position, it.id))

        const commentRows = []
        parsed.sections.forEach(s => {
            const sectionId = byPosition.get(s.position)
            s.items.forEach(it => {
                const itemId = itemKey.get(sectionId + '||' + it.position)
                it.comments.forEach(c => {
                    commentRows.push({
                        item_id: itemId,
                        name: c.name,
                        body_html: c.body_html,
                        comment_type: c.comment_type,
                        severity: c.severity,
                        answer_type: c.answer_type,
                        options: c.options,
                        position: c.position,
                        source_row_index: c.source_row_index,
                        raw_source: c.raw_source,
                    })
                })
            })
        })

        for (let i = 0; i < commentRows.length; i += 200) {
            const { error } = await supabase.from('comments').insert(commentRows.slice(i, i + 200))
            if (error) throw new Error('Could not create comments: ' + error.message)
        }

        if (parsed.issues.length) {
            await supabase.from('import_issues').insert(
                parsed.issues.map(x => ({...x, import_run_id: run.id }))
            )
        }

        await supabase.from('import_runs').update({
            template_id: template.id,
            status: 'complete',
            sections_created: sections.length,
            items_created: items.length,
            comments_created: commentRows.length,
        }).eq('id', run.id)

        return { templateId: template.id, runId: run.id, counts: parsed.counts, issues: parsed.issues }
    } catch (e) {
        await supabase.from('import_runs').update({ status: 'failed' }).eq('id', run.id)
        throw e
    }
}