-- Templates: the top level. One row per template.
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sections: Roof, Electrical, Plumbing.
-- position preserves the order the export had them in.
create table sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  name text not null,
  position integer not null,
  source_row_index integer,
  created_at timestamptz not null default now()
);

-- Items: Gutters, Flashing. Live inside a section.
create table items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  name text not null,
  position integer not null,
  source_row_index integer,
  created_at timestamptz not null default now()
);

-- Comments: the actual content the inspector spent years tuning.
create table comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  name text not null,
  body_html text,
  comment_type text,
  severity integer,
  answer_type text,
  options jsonb,
  position integer not null,
  source_row_index integer,
  raw_source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per upload attempt.
create table import_runs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references templates(id) on delete cascade,
  source_filename text,
  file_size_bytes integer,
  status text not null default 'pending',
  total_rows integer,
  sections_created integer,
  items_created integer,
  comments_created integer,
  created_at timestamptz not null default now()
);

-- Everything the importer skipped, stripped, or could not handle.
create table import_issues (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references import_runs(id) on delete cascade,
  row_index integer,
  issue_type text not null,
  severity text not null default 'warning',
  message text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index on sections(template_id);
create index on items(section_id);
create index on comments(item_id);
create index on import_issues(import_run_id);