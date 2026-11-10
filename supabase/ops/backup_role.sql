-- Permisos del usuario de respaldos (solo lectura). Se ejecuta a mano en el SQL Editor de Supabase.
-- Antes, crear el usuario con una contraseña larga y única (esto NO va en el repo):
--     create role backup_reader login password 'UNA-CONTRASEÑA-LARGA';
-- Se puede volver a ejecutar sin problema; hay que repetirlo cuando se agregue una tabla nueva.
-- (El respaldo avisa y se detiene si encuentra una tabla sin su política: nunca sale incompleto en silencio.)

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'backup_reader') then
    raise exception 'Primero crea el usuario: create role backup_reader login password ''...''';
  end if;
end $$;

-- nunca escribe, aunque alguien le diera permisos por error
alter role backup_reader set default_transaction_read_only = on;

grant usage on schema public to backup_reader;
grant select on all tables in schema public to backup_reader;
grant select on all sequences in schema public to backup_reader;
alter default privileges in schema public grant select on tables to backup_reader;

-- las cuentas (correo y clave cifrada) para poder restaurar los accesos
grant usage on schema auth to backup_reader;
do $$
begin
  if to_regclass('auth.users') is not null then grant select on auth.users to backup_reader; end if;
  if to_regclass('auth.identities') is not null then grant select on auth.identities to backup_reader; end if;
end $$;

-- Las tablas tienen RLS: sin una política el usuario vería cero filas. Esta le deja leer todo, solo a él.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop policy if exists backup_read on public.%I', t);
    execute format('create policy backup_read on public.%I for select to backup_reader using (true)', t);
  end loop;
end $$;
