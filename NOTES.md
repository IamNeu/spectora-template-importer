# NOTES

Repo: https://github.com/IamNeu/spectora-template-importer

## Input file
Template: InterNACHI Residential
Source: Spectora Template Center (free trial account)
Exported 14 Sep 2026 via Templates -> ... -> Export to spreadsheet -> Export HTML Text
Committed at: spectora-export/internachi-residential-2026-09-14.xls

## What the export actually looks like
- One sheet, 392 rows, 42 columns
- One row = one comment. Hierarchy is repeated on every row, not nested
- 13 sections, 69 items, 392 comments
- Comment types: 302 defect, 78 info, 12 limit
- Answer types: 315 boolean, 72 checkbox, 4 number, 1 text
- HTML in comment text: 244 <p>, 43 <a href>, 1 <strong>, 1 <div>

## Traps found in the export (the hard part)
1. File is named .xls but is really a modern XLSX zip. Parsers that dispatch
   on file extension reject it. Must read the bytes.
2. Section and item ORDER exists in no column. Only physical row order records
   it. Any sort or dict-keying silently destroys the customer's arrangement.
3. "Order (w/i item)" column is unreliable: it has gaps (0,2,3,4) and
   duplicates (two comments both = 0). Needs row index as a tiebreaker.
4. HTML entities are NOT decoded. A section name is stored literally as
   "Basement, Foundation, Crawlspace &amp; Structure".
5. 83 comments have a name but empty body text. A naive "skip empty rows"
   check would delete a fifth of the template.
6. Comment text contains non-breaking spaces and Windows line endings.

## Stack decisions

Next.js (App Router, JavaScript) in a single Vercel project. Frontend and API
routes live together, so there is no CORS setup and no separate backend to
keep awake. On a previous project I ran the frontend on Vercel and the backend
on Render and lost hours to CORS errors, hardcoded localhost URLs, and the
free tier sleeping between requests. One deployment target removes that whole
class of problem.

JavaScript, not TypeScript. Short build window and a new framework; types
would have slowed this down more than they helped.

Tailwind for styling. Hand-written CSS was not a good use of the time.

Supabase (Postgres, Mumbai region). The data is genuinely relational:
templates contain sections, which contain items, which contain comments.
Copying a template is a set of related inserts that Postgres handles cleanly.
Its table viewer also made it easy to
verify imported rows against the source file.

Row Level Security left off. The app has no login, so there are no per-user
rows to isolate, and enabling RLS would only have blocked the app from reading
its own tables. A production version with accounts would need auth plus RLS
policies. A deliberate cut, not an oversight.

## Schema design

Six tables: templates -> sections -> items -> comments, plus import_runs and
import_issues. Full DDL in db/schema.sql.

- Every section, item and comment carries a position integer. This is the fix
  for trap #2: order must be captured at parse time or it is lost silently.
- Every row also carries source_row_index, pointing back to the row of the
  spreadsheet it came from.
- Comments carry raw_source (jsonb) holding the original untouched cell
  values. This is the preservation proof: any comment in the app can be traced
  back to its exact source row, so verifying import fidelity is a query rather
  than a matter of trust.
- Foreign keys use ON DELETE CASCADE so deleting a template cleans up its
  sections, items and comments rather than leaving orphans.
- import_runs records each upload attempt with counts. import_issues records
  every row skipped, stripped or unhandled, with a reason and a row index.
  These two tables are what make skipped content visible to the user rather
  than silently dropped, so the user always knows exactly what came across.

## Importer

The parser is deterministic - no model in the import path. A spreadsheet with
fixed column headers does not need one, and a model could invent sections or
drop rows, which is the exact failure this customer cannot tolerate.
Validation is explicit: required columns are checked up front, and a file
missing them is rejected with a message naming the missing column rather than
importing partial garbage.

How each trap is handled:
1. .xls that is really xlsx - the file is read from its bytes via SheetJS,
   not dispatched on its extension.
2. Section/item order - rows are walked in file order and position is recorded
   on first appearance. Nothing is sorted or keyed by name alone.
3. Unreliable "Order (w/i item)" column - kept as source data, but position
   within an item comes from arrival order. Rows with no order value are
   logged as an info-level issue rather than silently renumbered.
4. HTML entities - decoded on names and text.
5. Comments with no body - imported as normal rows with a null body. Only rows
   missing a section, item or comment NAME are skipped, and each skip is
   recorded in import_issues with its row number and full original row.
6. Non-breaking spaces and CRLF - normalised in names; comment bodies are
   stored as they came, so formatting is preserved.

Default photo columns are detected but not imported. If a file contains them,
the importer records a warning saying how many rows have photos, so the user
is told rather than left to assume they came across.

## Deliberately cut
- No rich-text editor. Comment HTML is edited in a plain textarea. A WYSIWYG
  editor risks silently rewriting markup on save, which is the opposite of
  what this customer needs. Showing the HTML is honest about what is stored.
- No drag-to-reorder. Order is imported faithfully and stored as an integer
  position; reordering is a next step, not a baseline requirement.
- No auth. A single-user tool, so the time was better spent
  on import fidelity.
- No automated test suite. Verification was done by count queries against
  Postgres and by spot-checking source_row_index against the spreadsheet.
- Section- and item-level duplication. Only whole-template
  duplication is implemented.
- Default photos are parsed and reported but not imported.
- Only Spectora is supported. A fuller importer would let the user pick a source
  platform first (e.g. HomeGauge), with a per-source parser
  behind the same interface.

## Known limitations
- Supported input: Spectora "Export to spreadsheet - Export HTML Text", as
  .xls or .xlsx. Required columns: Section Name, Item Name, Comment Name.
- A file missing those columns is rejected with a message naming the missing
  column. Nothing is written to the database on a failed import.
- Rows with no section, item or comment name are skipped and recorded in
  import_issues with their row number and full original row.
- Comment HTML is stored as-is. Links, paragraphs and inline formatting are
  preserved. No sanitisation is applied, which is acceptable for a
  single-tenant tool but would need an allowlist before multi-tenant use.
- Not tested against exports from other platforms.

## How I checked my work
- Parsed the committed export: 392 rows in, 392 comments out, 13 sections,
  69 items - matching the counts found when the file was first analysed.
- Verified in Postgres after import with a count query across all four tables.
- Checked section order in the database matches the order in the spreadsheet.
- Checked entity decoding: "Basement, Foundation, Crawlspace &amp; Structure"
  is stored as "Basement, Foundation, Crawlspace & Structure".
- Spot-checked comment names against the source, e.g. "Evidence of Water
  Intrusion" is stored complete at 27 characters.
- Confirmed an edit survives a page reload, and that renaming a section in a
  duplicated template leaves the original unchanged.
- Confirmed a non-Spectora file is rejected with a clear message and writes
  nothing to the database.
- Every comment carries source_row_index and raw_source, so any row in the app
  can be traced back to its original spreadsheet row.

## Time spent
Roughly 12 hours across five days, covering analysis of
the Spectora export, schema design, the build, deployment and documentation.

## Credits
- create-next-app (Next.js scaffold)
- SheetJS (xlsx) for spreadsheet parsing, installed from the maintained CDN
  build rather than the npm registry version, which carries an unpatched
  advisory
- Supabase JS client
- Tailwind CSS
- Claude (Anthropic) used throughout for file analysis, schema design, code
  generation and debugging. All output reviewed and tested against the real
  export before committing.

## Build history
Built over roughly 12 hours, in three stages:
1. Analysed the Spectora export and documented the six traps above.
2. Designed the schema in Supabase and scaffolded the Next.js app on Vercel.
3. Built the parser, import writer, editor, duplication and the
   import-issues panel. Verified 392/392 comments imported and tested
   the failure case.

This repository was published as a single clean commit, so the
original day-by-day commit history is not included.
