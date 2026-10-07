# Spectora template importer

Imports a Spectora HTML-text template export into a structured, editable
database, so an inspection company moving off Spectora keeps the template
they have spent years tuning.


## What it does

- **Import** a Spectora "Export to spreadsheet - Export HTML Text" file.
  Text, hierarchy and ordering are preserved. Anything skipped is recorded
  and shown to the user, never silently dropped.
- **Edit** section names, item names, comment names and comment bodies.
  Changes save to Postgres.
- **Copy** a whole template and edit the copy independently.
- **Store** everything in Supabase (Postgres). Data survives restarts.

## Stack

Next.js (App Router, JavaScript) on Vercel, Supabase Postgres, SheetJS for
parsing, Tailwind for styling. Frontend and API routes live in one project,
so there is one deployment and no CORS configuration.

## Setup

```bash
git clone https://github.com/IamNeu/spectora-template-importer.git
cd spectora-template-importer
npm install
```

### Database

Create a Supabase project, open the SQL Editor, and run `db/schema.sql`.
That creates six tables: `templates`, `sections`, `items`, `comments`,
`import_runs`, `import_issues`.

Row Level Security is not enabled. The app has no authentication, so there
are no per-user rows to isolate.

### Environment variables

Create `.env.local`:

Both come from the Supabase dashboard (Project Settings, API Keys and
Data API). The same two variables must be set in Vercel for deployment.

### Run

```bash
npm run dev
```

### Seed a template from the command line

```bash
node scripts/seed.mjs
```

Imports the committed export at
`spectora-export/internachi-residential-2026-09-14.xls`.

### Verify an import

```bash
node scripts/test-parse.mjs
```

Parses the committed export without writing to the database and prints the
counts. Expect 13 sections, 69 items, 392 comments from 392 rows.

## Input file

`spectora-export/internachi-residential-2026-09-14.xls` — the InterNACHI
Residential template from the Spectora Template Center, exported 14 Sep 2026.
Note the file is named `.xls` but is really a modern XLSX; the parser reads
the bytes rather than trusting the extension.

## Notes

See `NOTES.md` for what was cut and why, known limitations, how the import
was verified, and the traps found in the export format.
