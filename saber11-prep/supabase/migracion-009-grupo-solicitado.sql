-- Migración 009: al registrarse, el estudiante puede pedir unirse a un grupo.
-- Ejecutar en el SQL Editor de Supabase después de la 008.

alter table perfiles add column if not exists grupo_solicitado uuid references grupos(id) on delete set null;

-- Lista de grupos que puede ver quien aún no tiene cuenta (solo id, nombre, colegio y curso).
create or replace function grupos_abiertos() returns table (id uuid, nombre text, colegio text, curso text)
language sql stable security definer set search_path = public as $$
  select g.id, g.nombre, g.colegio, g.curso from grupos g order by g.nombre
$$;
grant execute on function grupos_abiertos() to anon, authenticated;
