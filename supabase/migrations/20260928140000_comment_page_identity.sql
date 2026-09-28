-- Scope each comment to the route that was visible when it was created.
-- This is nullable for backwards compatibility; legacy comments are treated
-- as belonging to the prototype's starting URL by the client.

alter table public.comments add column if not exists page_url text;

create index if not exists comments_prototype_page_url_idx
  on public.comments(prototype_id, page_url);
