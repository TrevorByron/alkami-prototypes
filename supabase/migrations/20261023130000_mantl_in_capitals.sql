-- MANTL is written in capitals. The register-prototype function now writes it
-- that way; this updates what it already stored: the bot's profile name, the
-- descriptions of shared prototypes and the intro comments it posted. Safe to
-- re-run.

update public.profiles
   set name = replace(name, 'Prototyping in Mantl', 'Prototyping in MANTL')
 where name like '%Prototyping in Mantl%';

update public.prototypes
   set description = replace(description, 'Prototyping in Mantl', 'Prototyping in MANTL')
 where description like '%Prototyping in Mantl%';

update public.comments
   set body = replace(body, 'Prototyping in Mantl', 'Prototyping in MANTL')
 where body like '%Prototyping in Mantl%';
