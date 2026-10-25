-- ═══ TODAS LAS MIGRACIONES PENDIENTES EN UN SOLO ARCHIVO (004 a 009) ═══
-- Pegar completo en Supabase → SQL Editor → New query → Run. Se puede ejecutar varias veces:
-- cada política se borra antes de crearse y las columnas/funciones usan 'if not exists' / 'or replace'.
-- Generado desde los archivos migracion-00X.sql; si cambian, regenerar.

-- ───────────────── migracion-004-planes.sql ─────────────────
-- ─── Migración 004: plan de acceso al banco por grupo ────────────────────────
-- Ejecutar una vez en el SQL Editor de Supabase (después de migracion-003).
--
-- plan: 'completo' (todo el banco) o 'mensual' (plan_lote preguntas POR ASIGNATURA
-- cada mes desde plan_inicio, acumulando; 100 → 500 en total por mes). Lo calcula la app; aquí solo se guarda.
alter table grupos add column if not exists plan text not null default 'completo'
  check (plan in ('completo', 'mensual'));
alter table grupos add column if not exists plan_inicio timestamptz default now();
alter table grupos add column if not exists plan_lote int default 100;

-- ───────────────── migracion-005-ruta.sql ─────────────────
-- ─── Migración 005: configuración de "Mi ruta para mejorar" ──────────────────
-- Ejecutar una vez en el SQL Editor de Supabase (después de migracion-004).
-- Guarda, por estudiante, lo que él mismo define: grado, fecha del examen,
-- minutos por día, días por semana y meta de puntaje global. La app funciona
-- sin esto (lo guarda en el dispositivo); con esto, la ruta lo sigue entre equipos.
alter table perfiles add column if not exists ruta_config jsonb;

create or replace function guardar_ruta(p_config jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_config) <> 'object' then raise exception 'config inválida'; end if;
  update perfiles set ruta_config = p_config where id = auth.uid();
end $$;
grant execute on function guardar_ruta(jsonb) to authenticated;

-- ───────────────── migracion-006-futuro.sql ─────────────────
-- ─── Migración 006: «Mi futuro» (orientación vocacional y proyecto de vida) ──
-- Ejecutar una vez en el SQL Editor de Supabase (después de migracion-005).
-- Guarda, por estudiante, su cuestionario de intereses, valores, entorno, opciones
-- guardadas, comparaciones, proyecto de vida y actividades. Solo el propio
-- estudiante escribe su fila (auth.uid()). La app funciona sin esto (guarda en el
-- dispositivo); con esto, el avance sigue al estudiante entre equipos.
-- Privacidad: el docente no consulta esta columna desde la app.
alter table perfiles add column if not exists futuro jsonb;

create or replace function guardar_futuro(p_futuro jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_futuro is not null and jsonb_typeof(p_futuro) <> 'object' then raise exception 'datos inválidos'; end if;
  update perfiles set futuro = p_futuro where id = auth.uid();
end $$;
grant execute on function guardar_futuro(jsonb) to authenticated;

-- ───────────────── migracion-007-intentos-docente.sql ─────────────────
-- ─── Migración 007: el docente puede reenviar intentos y sesiones de sus estudiantes ──
-- Ejecutar una vez en el SQL Editor de Supabase (después de migracion-006).
-- Hasta ahora el docente/admin podía INSERTAR intentos de sus estudiantes (registro en
-- papel) pero no actualizarlos; si la app reintentaba subir uno ya existente, Supabase
-- respondía "new row violates row-level security policy (USING expression)". Con esto
-- el reenvío es idempotente para el docente de ese estudiante y para el administrador.
drop policy if exists intentos_docente_actualiza on intentos;
create policy intentos_docente_actualiza on intentos for update
  using (es_mi_estudiante(estudiante_id) or rol_actual() = 'admin')
  with check (es_mi_estudiante(estudiante_id) or rol_actual() = 'admin');
drop policy if exists sesiones_docente_actualiza on sesiones;
create policy sesiones_docente_actualiza on sesiones for update
  using (es_mi_estudiante(estudiante_id) or rol_actual() = 'admin')
  with check (es_mi_estudiante(estudiante_id) or rol_actual() = 'admin');

-- ───────────────── migracion-008-revisor.sql ─────────────────
-- Migración 008: rol "revisor" (admin de solo lectura).
-- Ejecutar en el SQL Editor de Supabase después de la 007.
--
-- El revisor ve todos los grupos, estudiantes, intentos, sesiones, banco y
-- biblioteca, pero NO puede insertar, actualizar ni borrar nada: solo se le
-- agregan políticas "for select". Las políticas de escritura siguen siendo
-- exclusivas de docente (sobre lo suyo) y admin.

alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check check (rol in ('estudiante','docente','admin','revisor'));

create or replace function es_revisor() returns boolean language sql stable security definer as $$
  select coalesce((select rol from perfiles where id = auth.uid()) = 'revisor', false)
$$;

drop policy if exists perfiles_revisor on perfiles;
create policy perfiles_revisor on perfiles for select using (es_revisor());

drop policy if exists grupos_revisor on grupos;
create policy grupos_revisor on grupos for select using (es_revisor());

drop policy if exists intentos_revisor on intentos;
create policy intentos_revisor on intentos for select using (es_revisor());

drop policy if exists sesiones_revisor on sesiones;
create policy sesiones_revisor on sesiones for select using (es_revisor());

drop policy if exists asignaciones_revisor on asignaciones;
create policy asignaciones_revisor on asignaciones for select using (es_revisor());

drop policy if exists sesiones_docente_revisor on sesiones_docente;
create policy sesiones_docente_revisor on sesiones_docente for select using (es_revisor());

drop policy if exists preguntas_revisor on preguntas;
create policy preguntas_revisor on preguntas for select using (es_revisor());

drop policy if exists recursos_revisor on recursos;
create policy recursos_revisor on recursos for select using (es_revisor());

-- Cómo crear un revisor en la nube: invitar el correo desde Authentication →
-- Users y luego:  update perfiles set rol = 'revisor' where id = '<uuid>';

-- ───────────────── migracion-009-grupo-solicitado.sql ─────────────────
-- Migración 009: al registrarse, el estudiante puede pedir unirse a un grupo.
-- Ejecutar en el SQL Editor de Supabase después de la 008.

alter table perfiles add column if not exists grupo_solicitado uuid references grupos(id) on delete set null;

-- Lista de grupos que puede ver quien aún no tiene cuenta (solo id, nombre, colegio y curso).
create or replace function grupos_abiertos() returns table (id uuid, nombre text, colegio text, curso text)
language sql stable security definer set search_path = public as $$
  select g.id, g.nombre, g.colegio, g.curso from grupos g order by g.nombre
$$;
grant execute on function grupos_abiertos() to anon, authenticated;

