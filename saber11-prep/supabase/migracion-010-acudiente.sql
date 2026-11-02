-- ─── Migración 010: autorización del padre, madre o acudiente (Ley 1581 de 2012) ───
-- Ejecutar una vez en el SQL Editor de Supabase. Se puede volver a ejecutar sin daño.
-- El registro de estudiantes (casi siempre menores de edad) guarda quién autoriza y cuándo.
alter table perfiles add column if not exists acudiente_nombre text;
alter table perfiles add column if not exists autorizacion_acudiente timestamptz;
comment on column perfiles.acudiente_nombre is 'Nombre del padre, madre o acudiente que autorizó el registro (Ley 1581).';
comment on column perfiles.autorizacion_acudiente is 'Fecha y hora en que se marcó la autorización en el formulario de registro.';
-- La política de inserción del propio perfil (migración 002) no cambia: el estudiante solo crea
-- su fila como pendiente y sin grupo; estas dos columnas viajan en ese mismo insert.
