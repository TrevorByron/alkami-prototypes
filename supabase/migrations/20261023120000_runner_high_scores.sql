-- High scores for the pixel runner easter egg (src/components/PixelRunner.tsx).
-- Each member's best run is kept on their profile; the game shows whoever
-- holds the top score. Safe to re-run.

alter table public.profiles
  add column if not exists runner_best integer not null default 0,
  add column if not exists runner_best_at timestamptz;

alter table public.profiles drop constraint if exists profiles_runner_best_check;
alter table public.profiles
  add constraint profiles_runner_best_check check (runner_best >= 0);

create index if not exists profiles_runner_best_idx on public.profiles (runner_best desc);

-- Records a finished run for the signed-in member. It only ever raises their
-- own best (never lowers it, never touches anyone else's) and returns it.
create or replace function public.record_runner_score(p_score integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  best integer;
begin
  if auth.uid() is null or not public.is_alkami_member() then
    raise exception 'Only signed-in members can record a score';
  end if;

  update public.profiles
     set runner_best = greatest(runner_best, least(greatest(p_score, 0), 100000)),
         runner_best_at = case when p_score > runner_best then timezone('utc', now()) else runner_best_at end
   where id = auth.uid()
  returning runner_best into best;

  return coalesce(best, 0);
end;
$$;

revoke all on function public.record_runner_score(integer) from public;
grant execute on function public.record_runner_score(integer) to authenticated;
