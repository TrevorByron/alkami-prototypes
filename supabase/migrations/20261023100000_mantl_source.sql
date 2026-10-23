-- Prototypes that arrive on their own from Prototyping in Mantl (the shared
-- GitHub repository where designers publish with `pnpm share`). The
-- register-prototype Edge Function upserts one row per shared branch, keyed on
-- source_key, so re-sharing updates the same prototype and keeps its comments.
-- Archiving in Mantl sets archived_at instead of deleting. Safe to re-run.

alter table public.prototypes
  add column if not exists source text not null default 'manual',
  add column if not exists source_key text,
  add column if not exists source_meta jsonb,
  add column if not exists archived_at timestamptz;

alter table public.prototypes drop constraint if exists prototypes_source_check;
alter table public.prototypes
  add constraint prototypes_source_check check (source in ('manual', 'mantl'));

create unique index if not exists prototypes_source_key_idx
  on public.prototypes (source, source_key)
  where source_key is not null;

create index if not exists prototypes_archived_at_idx
  on public.prototypes (archived_at)
  where archived_at is not null;

comment on column public.prototypes.source is 'manual: added in the app. mantl: registered by Prototyping in Mantl.';
comment on column public.prototypes.source_key is 'For mantl: the proto/<name> branch in myfintech/prototyping-in-mantl.';
comment on column public.prototypes.source_meta is 'For mantl: branch, commit, author login, gallery/code/handoff links, page count.';
comment on column public.prototypes.archived_at is 'Set when the preview was taken down at the source; the row and its comments stay.';
