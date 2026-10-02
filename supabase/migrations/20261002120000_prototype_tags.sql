-- Category tags on prototypes, chosen from a fixed list in the add dialog
-- (src/lib/tags.ts). Safe to re-run.

alter table public.prototypes
  add column if not exists tags text[] not null default '{}';

alter table public.prototypes drop constraint if exists prototypes_tags_check;
alter table public.prototypes
  add constraint prototypes_tags_check check (
    tags <@ array['fun', 'exploratory', 'concept', 'working', 'review', 'committed', 'tool']::text[]
  );

create index if not exists prototypes_tags_idx on public.prototypes using gin (tags);
