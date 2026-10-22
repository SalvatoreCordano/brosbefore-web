-- Apoyo al almacenamiento en R2. Las llaves de archivo son `o/<uuid>` (original, privado),
-- `p/<uuid>` (versión ligera) y `a/<uuid>` (recursos públicos). El Worker `api` llama a estas
-- funciones con la sesión de quien pide el archivo; Supabase decide, no el Worker.

-- De las llaves pedidas, devuelve las que esta sesión puede leer en privado:
-- el admin todas; la pareja solo lo suyo que está publicado (o en su presentación publicada).
create function readable_keys(p_keys text[]) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(k), '{}')
  from unnest(p_keys) as k
  where is_admin() or exists (
    select 1 from files f
    where f.storage_key = 'o/' || split_part(k, '/', 2)
      and couple_of_moment(f.moment_id) = my_active_couple_id()
      and (f.published or exists (
        select 1 from presentation_published pp
        where pp.couple_id = my_active_couple_id()
          and pp.content -> 'items' @> jsonb_build_array(jsonb_build_object('fileId', f.id))
      ))
  )
$$;

-- Bytes ya guardados (solo lo ve el admin). El Worker lo usa para no pasarse del plan gratis.
create function storage_used_bytes() returns bigint
language sql stable security definer set search_path = public as $$
  select case when is_admin() then coalesce(sum(size_bytes), 0)::bigint else 0 end from files
$$;
