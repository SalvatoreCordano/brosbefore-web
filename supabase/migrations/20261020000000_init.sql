-- Esquema inicial de brosbefore. Una tabla por colección de `Db` (packages/core/src/types.ts).
-- Los ids son `text`: el cliente los genera (uuid) y el seed de las parejas originales usa slugs.
-- Todo está bajo RLS: sin política no se lee ni se escribe. Quién puede qué:
--   anon / cualquiera   → solo lo público (parejas en galería, sus fichas y las fotos que eligieron mostrar)
--   pareja (miembro)    → solo lo de su historia: archivos publicados y la presentación publicada
--   admin               → todo (tabla `admins`)

-- ---------------------------------------------------------------- tablas

create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table plans (
  id text primary key,
  name text not null,
  description text not null default '',
  price_from numeric not null default 0,
  includes jsonb not null default '[]'
);

create table couples (
  id text primary key,
  slug text not null unique,
  names text not null,
  plan_id text references plans (id) on delete set null,
  location text not null default '',
  wedding_date text not null default '',
  in_gallery boolean not null default false,
  in_portfolio boolean not null default false,
  portfolio_order int not null default 0,
  portal_status text not null default 'active' check (portal_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (not in_portfolio or in_gallery) -- sin galería no hay portafolio
);

create table coverages (
  id text primary key,
  couple_id text not null references couples (id) on delete cascade,
  type text not null check (type in ('boda', 'preboda', 'pedida')),
  date text not null default '',
  location text not null default '',
  show_in_gallery boolean not null default true,
  show_in_portfolio boolean not null default false,
  unique (couple_id, type)
);

create table moments (
  id text primary key,
  coverage_id text not null references coverages (id) on delete cascade,
  name text not null,
  "order" int not null default 0
);

create table files (
  id text primary key,
  moment_id text not null references moments (id) on delete cascade,
  kind text not null check (kind in ('photo', 'video')),
  name text not null,
  storage_key text not null,
  external_url text,
  poster text,
  width int,
  height int,
  duration_sec numeric,
  size_bytes bigint,
  taken_at text,
  "order" int not null default 0,
  published boolean not null default false
);

create table public_profiles (
  couple_id text primary key references couples (id) on delete cascade,
  cover_file_id text references files (id) on delete set null,
  cover_position text,
  cover_motion_key text,
  banner jsonb,
  title text not null default '',
  description text not null default ''
);

create table public_items (
  id text primary key,
  coverage_id text not null references coverages (id) on delete cascade,
  file_id text not null references files (id) on delete cascade,
  scope text not null check (scope in ('gallery', 'portfolio')),
  "order" int not null default 0
);

-- Borrador de la presentación del portal: solo el admin lo ve.
create table presentations (
  couple_id text primary key references couples (id) on delete cascade,
  banner jsonb,
  song_key text,
  song_name text,
  message text not null default '',
  message_signature text not null default '',
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Última versión publicada (con sus items): es lo único que ve la pareja.
create table presentation_published (
  couple_id text primary key references couples (id) on delete cascade,
  content jsonb not null,
  published_at timestamptz
);

create table pres_items (
  id text primary key,
  coverage_id text not null references coverages (id) on delete cascade,
  file_id text not null references files (id) on delete cascade,
  role text not null check (role in ('main_video', 'secondary_video', 'featured_photo')),
  "order" int not null default 0
);

create table tags (
  id text primary key,
  name text not null unique
);

create table couple_tags (
  couple_id text not null references couples (id) on delete cascade,
  tag_id text not null references tags (id) on delete cascade,
  primary key (couple_id, tag_id)
);

create table members (
  id text primary key,
  couple_id text not null references couples (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  name text not null default '',
  status text not null default 'saved' check (status in ('saved', 'invited', 'active', 'expired', 'revoked')),
  invited_at timestamptz,
  invite_token text unique
);
create unique index members_email_uq on members (lower(email)) where status <> 'revoked';
create unique index members_user_uq on members (user_id) where status = 'active';

create table testimonials (
  id text primary key,
  couple_id text not null references couples (id) on delete cascade,
  member_id text not null references members (id) on delete cascade,
  original_text text not null default '',
  published_text text not null default '',
  reposted boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (member_id)
);

create index coverages_couple_idx on coverages (couple_id);
create index moments_coverage_idx on moments (coverage_id);
create index files_moment_idx on files (moment_id);
create index public_items_coverage_idx on public_items (coverage_id);
create index pres_items_coverage_idx on pres_items (coverage_id);
create index members_user_idx on members (user_id);

-- ---------------------------------------------------------------- funciones auxiliares
-- security definer: leen tablas sin pasar por RLS, para que las políticas no se llamen en círculo.

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

-- historia de la pareja que inició sesión (solo con acceso activo)
create function my_couple_id() returns text
language sql stable security definer set search_path = public as $$
  select couple_id from members where user_id = auth.uid() and status = 'active' limit 1
$$;

-- igual, pero solo si el portal de esa pareja no está suspendido
create function my_active_couple_id() returns text
language sql stable security definer set search_path = public as $$
  select m.couple_id from members m join couples c on c.id = m.couple_id
  where m.user_id = auth.uid() and m.status = 'active' and c.portal_status = 'active' limit 1
$$;

create function is_public_couple(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from couples where id = cid and in_gallery and deleted_at is null)
$$;

create function couple_of_coverage(cvid text) returns text
language sql stable security definer set search_path = public as $$
  select couple_id from coverages where id = cvid
$$;

create function couple_of_moment(mid text) returns text
language sql stable security definer set search_path = public as $$
  select cv.couple_id from moments m join coverages cv on cv.id = m.coverage_id where m.id = mid
$$;

-- ---------------------------------------------------------------- RLS

alter table admins enable row level security;
alter table plans enable row level security;
alter table couples enable row level security;
alter table coverages enable row level security;
alter table moments enable row level security;
alter table files enable row level security;
alter table public_profiles enable row level security;
alter table public_items enable row level security;
alter table presentations enable row level security;
alter table presentation_published enable row level security;
alter table pres_items enable row level security;
alter table tags enable row level security;
alter table couple_tags enable row level security;
alter table members enable row level security;
alter table testimonials enable row level security;

-- el admin puede todo en cada tabla (la tabla `admins` solo se edita desde el SQL editor)
do $$
declare t text;
begin
  foreach t in array array['plans','couples','coverages','moments','files','public_profiles','public_items',
    'presentations','presentation_published','pres_items','tags','couple_tags','members','testimonials']
  loop
    execute format('create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin())', t || '_admin', t);
  end loop;
end $$;

create policy admins_self on admins for select to authenticated using (user_id = auth.uid());

create policy plans_read on plans for select to anon, authenticated using (true);
create policy tags_read on tags for select to anon, authenticated using (true);

create policy couples_read on couples for select to anon, authenticated
  using ((deleted_at is null and in_gallery) or id = my_couple_id());

create policy coverages_read on coverages for select to anon, authenticated
  using (is_public_couple(couple_id) or couple_id = my_couple_id());

create policy moments_read on moments for select to anon, authenticated
  using (is_public_couple(couple_of_coverage(coverage_id)) or couple_of_coverage(coverage_id) = my_couple_id());

-- Públicas: solo las fotos elegidas para la web (public_items), portadas y banners de parejas visibles.
-- La pareja: sus archivos publicados, o los que usa su presentación publicada.
create policy files_read on files for select to anon, authenticated using (
  exists (select 1 from public_items pi
          where pi.file_id = files.id and is_public_couple(couple_of_coverage(pi.coverage_id)))
  or exists (select 1 from public_profiles pp
             where is_public_couple(pp.couple_id) and (pp.cover_file_id = files.id or pp.banner ->> 'fileId' = files.id))
  or (couple_of_moment(files.moment_id) = my_active_couple_id() and (
        files.published
        or exists (select 1 from presentation_published pp
                   where pp.couple_id = my_active_couple_id()
                     and pp.content -> 'items' @> jsonb_build_array(jsonb_build_object('fileId', files.id)))
      ))
);

create policy public_profiles_read on public_profiles for select to anon, authenticated
  using (is_public_couple(couple_id) or couple_id = my_couple_id());

create policy public_items_read on public_items for select to anon, authenticated
  using (is_public_couple(couple_of_coverage(coverage_id)));

create policy couple_tags_read on couple_tags for select to anon, authenticated
  using (is_public_couple(couple_id));

create policy presentation_published_read on presentation_published for select to authenticated
  using (couple_id = my_active_couple_id());

create policy members_self on members for select to authenticated using (user_id = auth.uid());

-- La pareja ve y escribe solo su propio agradecimiento. Lo que ve el público sale de la vista de abajo.
create policy testimonials_self_read on testimonials for select to authenticated
  using (member_id in (select id from members where user_id = auth.uid()));
create policy testimonials_self_insert on testimonials for insert to authenticated
  with check (
    couple_id = my_active_couple_id() and not reposted
    and member_id in (select id from members where user_id = auth.uid() and status = 'active')
  );
create policy testimonials_self_update on testimonials for update to authenticated
  using (not reposted and member_id in (select id from members where user_id = auth.uid()))
  with check (not reposted and member_id in (select id from members where user_id = auth.uid()));

-- Una pareja con sesión solo puede cambiar el texto original: nunca lo publicado ni a quién pertenece.
-- (Sin usuario —service_role o SQL editor— no se restringe; el público anónimo no tiene permiso de escritura.)
create function testimonials_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    new.member_id := old.member_id;
    new.couple_id := old.couple_id;
    new.published_text := old.published_text;
    new.reposted := old.reposted;
  end if;
  return new;
end $$;
create trigger testimonials_guard before update on testimonials
  for each row execute function testimonials_guard();

-- Agradecimientos que el admin republicó, sin el texto original de la pareja.
create view testimonials_public as
  select t.id, t.couple_id, t.published_text, t.updated_at
  from testimonials t
  where t.reposted and is_public_couple(t.couple_id);
grant select on testimonials_public to anon, authenticated;

-- ---------------------------------------------------------------- invitaciones
-- La pareja crea su cuenta con Supabase Auth (signUp) y después reclama la invitación.
-- Reclamar exige que el correo de la cuenta sea el invitado, así que no hace falta service_role.

create function get_invite(p_token text) returns table (email text, names text)
language sql stable security definer set search_path = public as $$
  select m.email, c.names from members m join couples c on c.id = m.couple_id
  where m.invite_token = p_token and m.status = 'invited' and m.invited_at > now() - interval '14 days'
$$;

create function claim_invite(p_token text, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v members;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  select * into v from members
    where invite_token = p_token and status = 'invited' and invited_at > now() - interval '14 days'
    for update;
  if not found then raise exception 'invitacion_invalida'; end if;
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(v.email) then raise exception 'correo_distinto'; end if;
  update members set user_id = auth.uid(), name = trim(p_name), status = 'active', invite_token = null where id = v.id;
end $$;

grant execute on function get_invite(text) to anon, authenticated;
grant execute on function claim_invite(text, text) to authenticated;

-- anon nunca escribe, pase lo que pase con las políticas
revoke insert, update, delete, truncate on all tables in schema public from anon;
