-- A prototype's description now opens its comment thread as the builder's
-- first comment (the app posts it when a prototype is added, and the viewer
-- pins it to the top). This posts the descriptions of prototypes added before
-- that, dated when the prototype was added so it stays the first comment.
-- Safe to re-run: a prototype that already has the comment is skipped.

insert into public.comments (prototype_id, author_id, body, created_at)
select prototype.id,
       coalesce(prototype.owner_id, prototype.created_by),
       btrim(prototype.description),
       prototype.created_at
  from public.prototypes prototype
 where nullif(btrim(prototype.description), '') is not null
   and coalesce(prototype.owner_id, prototype.created_by) is not null
   and exists (
     select 1 from public.profiles profile
      where profile.id = coalesce(prototype.owner_id, prototype.created_by)
   )
   and not exists (
     select 1
       from public.comments comment
      where comment.prototype_id = prototype.id
        and comment.author_id in (prototype.owner_id, prototype.created_by)
        and btrim(comment.body) = btrim(prototype.description)
   );
