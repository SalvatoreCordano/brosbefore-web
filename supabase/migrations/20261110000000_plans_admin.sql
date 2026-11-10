-- Planes editables desde el admin.
--  · `includes` pasa de una lista de textos a renglones { label, lines } (Cobertura, Crew, Entregables, Entrega),
--    como se ven en la página de planes.
--  · `featured`: el plan que se destaca en la web (solo uno).
--  · `active`: un plan oculto no lo ve el público; el admin lo ve y lo puede volver a mostrar.

alter table plans add column featured boolean not null default false;
alter table plans add column active boolean not null default true;

drop policy plans_read on plans;
create policy plans_read on plans for select to anon, authenticated using (active);

-- Los tres planes iniciales, con el contenido que tenía la página de planes.
update plans set includes = v.inc::jsonb, featured = v.feat
from (values
  ('plan_essentials', '[{"label":"Cobertura","lines":["El día de la boda, hasta 6 horas de cobertura continua"]},{"label":"Crew","lines":["1 fotógrafo principal y 1 filmmaker"]},{"label":"Entregables","lines":["Galería online personalizada (+300 fotos)","Un highlight film (2:30 a 3 min)"]},{"label":"Entrega","lines":["4 a 6 semanas después de la boda"]}]', false),
  ('plan_story', '[{"label":"Cobertura","lines":["2 días: sesión pre-boda (fotos y video) y el día de la boda (hasta 8 hrs)"]},{"label":"Crew","lines":["1 fotógrafo principal y 1 filmmaker"]},{"label":"Entregables","lines":["Galería online personalizada (+500 fotos), algunas análogas (cámara a rollo)","Un story film (3 a 4:30 min)","Un wedding reel (en 24 hrs / 30 s)"]},{"label":"Entrega","lines":["4 a 6 semanas después de la boda"]}]', true),
  ('plan_legacy', '[{"label":"Cobertura","lines":["2 días: sesión pre-boda (fotos y video) y el día de la boda (hasta 12 hrs)"]},{"label":"Crew","lines":["2 fotógrafos y 2 filmmakers"]},{"label":"Entregables","lines":["Galería online personalizada (+800 fotos)","Galería análoga (+150 fotos en 35mm y 120mm)","Un legacy film (7 a 10 min)","Un wedding reel (en 24 hrs / 1 min)","Un dump de video (carrusel IG / 24 hrs / 5 videos colorizados)"]},{"label":"Entrega","lines":["6 a 8 semanas después de la boda"]}]', false)
) as v (id, inc, feat)
where plans.id = v.id;
