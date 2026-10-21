-- Migración 009: clases (reuniones por Google Meet u otro enlace) programadas por el docente.
-- Ejecutar en el SQL Editor de Supabase después de la 008.
--
-- El docente crea la reunión en Google Meet y pega el enlace; los estudiantes
-- de su grupo la ven en su inicio con el botón «Entrar a la clase».

create table if not exists clases (
  id uuid primary key,
  grupo_id uuid not null references grupos(id) on delete cascade,
  docente_id uuid references perfiles(id) on delete set null,
  titulo text not null,
  fecha timestamptz not null,
  duracion_min integer default 60,
  enlace text default '',
  nota text default '',
  estado text default 'programada' check (estado in ('programada','cancelada')),
  fecha_creacion timestamptz default now()
);
create index if not exists clases_grupo_fecha on clases (grupo_id, fecha);

alter table clases enable row level security;

-- Estudiantes del grupo leen; el docente del grupo y el admin gestionan; el revisor lee.
drop policy if exists clases_leer on clases;
create policy clases_leer on clases for select using (
  grupo_id = mi_grupo() or docente_id = auth.uid() or rol_actual() = 'admin' or es_revisor()
);
drop policy if exists clases_gestion on clases;
create policy clases_gestion on clases for all
  using (docente_id = auth.uid() or rol_actual() = 'admin')
  with check (docente_id = auth.uid() or rol_actual() = 'admin');
