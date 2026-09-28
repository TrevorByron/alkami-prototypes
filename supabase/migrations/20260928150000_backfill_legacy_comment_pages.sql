-- Comments created before page_url existed were prototype-level records. Give
-- them the prototype's starting route so NULL can safely mean "general".

update public.comments as c
set page_url = p.url
from public.prototypes as p
where c.prototype_id = p.id
  and c.page_url is null;
