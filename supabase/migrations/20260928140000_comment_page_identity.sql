-- Scope each comment to the route that was visible when it was created.
-- Nullable is reserved for general comments. Legacy comments are backfilled
-- to the prototype's starting URL in the follow-up migration.

alter table public.comments add column if not exists page_url text;

create index if not exists comments_prototype_page_url_idx
  on public.comments(prototype_id, page_url);
