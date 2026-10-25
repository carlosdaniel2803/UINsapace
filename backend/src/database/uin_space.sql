-- =====================================================================
-- UIN Space — esquema PostgreSQL
-- Basado en el dump de MariaDB + roles/permisos del diagrama de actividades
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;  -- evita traslapes de reservas

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
CREATE TYPE room_type          AS ENUM ('aula','computo','laboratorio','biblioteca','auditorio','oficina','sala','otro');
CREATE TYPE equipment_status   AS ENUM ('disponible','en_mantenimiento','fuera_de_servicio');
CREATE TYPE reservation_status AS ENUM ('confirmada','cancelada');
CREATE TYPE report_status      AS ENUM ('pendiente','en_proceso','resuelto');
CREATE TYPE report_priority    AS ENUM ('baja','media','alta','urgente');

-- ---------------------------------------------------------------------
-- Trigger genérico para updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- ROLES Y PERMISOS
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        varchar(30)  NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  name        varchar(60)  NOT NULL,
  description varchar(255),
  is_system   boolean      NOT NULL DEFAULT false,  -- true = rol predeterminado, no se puede borrar
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- Los roles predeterminados no se pueden borrar ni cambiar de código
CREATE OR REPLACE FUNCTION protect_system_roles() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'El rol "%" es predeterminado y no se puede eliminar', OLD.name;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.is_system AND (NEW.code <> OLD.code OR NEW.is_system = false) THEN
    RAISE EXCEPTION 'El rol "%" es predeterminado y no se puede modificar su código', OLD.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roles_protect BEFORE UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION protect_system_roles();

CREATE TABLE permissions (
  id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        varchar(50)  NOT NULL UNIQUE,   -- ej. 'reservations.create'
  description varchar(255)
);

CREATE TABLE role_permissions (
  role_id       smallint NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id smallint NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ---------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  control_number varchar(20)  NOT NULL UNIQUE,
  name           varchar(150) NOT NULL,
  email          varchar(150) NOT NULL,
  password_hash  varchar(255) NOT NULL,
  career         varchar(150),
  role_id        smallint     NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  active         boolean      NOT NULL DEFAULT true,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX idx_users_role   ON users (role_id);
CREATE INDEX idx_users_active ON users (active);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- ESPACIOS Y EQUIPO
-- ---------------------------------------------------------------------
CREATE TABLE rooms (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       varchar(150) NOT NULL UNIQUE,
  type       room_type    NOT NULL,
  capacity   integer      NOT NULL CHECK (capacity > 0),
  location   varchar(150),
  active     boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE equipment_types (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        varchar(100) NOT NULL UNIQUE,
  description varchar(255),
  active      boolean      NOT NULL DEFAULT true
);

CREATE TABLE room_equipment (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id           bigint            NOT NULL REFERENCES rooms(id) ON DELETE CASCADE ON UPDATE CASCADE,
  equipment_type_id integer           NOT NULL REFERENCES equipment_types(id) ON UPDATE CASCADE,
  quantity          integer           NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  status            equipment_status  NOT NULL DEFAULT 'disponible',
  notes             text,
  UNIQUE (room_id, equipment_type_id)
);
CREATE INDEX idx_room_equipment_room ON room_equipment (room_id);

-- ---------------------------------------------------------------------
-- RESERVAS
-- ---------------------------------------------------------------------
CREATE TABLE reservations (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       bigint             NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
  room_id       bigint             NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE,
  date          date               NOT NULL,
  start_time    time               NOT NULL,
  end_time      time               NOT NULL,
  status        reservation_status NOT NULL DEFAULT 'confirmada',
  purpose       varchar(255),
  -- cancelación (flujo de Prefectura)
  cancelled_by  bigint REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  cancelled_at  timestamptz,
  cancel_reason varchar(255),
  created_at    timestamptz        NOT NULL DEFAULT now(),
  updated_at    timestamptz        NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  -- Una sala no puede tener dos reservas confirmadas que se traslapen
  CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
    room_id WITH =,
    tsrange(date + start_time, date + end_time) WITH &&
  ) WHERE (status = 'confirmada')
);
CREATE INDEX idx_reservations_room_date ON reservations (room_id, date);
CREATE INDEX idx_reservations_user      ON reservations (user_id);
CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- REPORTES / ANOMALÍAS
-- ---------------------------------------------------------------------
CREATE TABLE reports (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id          bigint          NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE,
  user_id          bigint          NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
  equipment_id     bigint          REFERENCES room_equipment(id) ON DELETE SET NULL ON UPDATE CASCADE,
  description      text            NOT NULL,
  status           report_status   NOT NULL DEFAULT 'pendiente',
  priority         report_priority NOT NULL DEFAULT 'media',
  assigned_to      bigint          REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  resolution_notes text,
  created_at       timestamptz     NOT NULL DEFAULT now(),
  updated_at       timestamptz     NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);
CREATE INDEX idx_reports_status   ON reports (status);
CREATE INDEX idx_reports_room     ON reports (room_id);
CREATE INDEX idx_reports_user     ON reports (user_id);
CREATE INDEX idx_reports_assigned ON reports (assigned_to);
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- DATOS INICIALES
-- =====================================================================

-- Todo permiso nuevo se le asigna automáticamente al administrador
CREATE OR REPLACE FUNCTION grant_permission_to_admin() RETURNS trigger AS $$
BEGIN
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT id, NEW.id FROM roles WHERE code = 'administrador'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_permissions_grant_admin AFTER INSERT ON permissions
  FOR EACH ROW EXECUTE FUNCTION grant_permission_to_admin();

-- Al administrador no se le pueden quitar permisos (evita que se bloquee solo)
CREATE OR REPLACE FUNCTION protect_admin_permissions() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM roles WHERE id = OLD.role_id AND code = 'administrador') THEN
    RAISE EXCEPTION 'No se pueden quitar permisos al rol Administrador';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_role_permissions_protect_admin BEFORE DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION protect_admin_permissions();

INSERT INTO equipment_types (name, description) VALUES
  ('Proyector',          'Proyector para presentaciones'),
  ('Computadora',        'Computadora de escritorio'),
  ('Aire acondicionado', 'Sistema de aire acondicionado'),
  ('Ventilador',         'Ventilador para el salón'),
  ('Extractor',          'Extractor de aire'),
  ('Bocinas',            'Sistema de audio o bocinas'),
  ('Pizarrón',           'Pizarrón para clases'),
  ('Periféricos',        'Teclados, mouse, cámaras, etc.'),
  ('Bancas',             'Bancas para estudiantes'),
  ('Baños',              'Baños disponibles en el espacio'),
  ('Mesas',              'Mesas para estudiantes o trabajo'),
  ('Sillas',             'Sillas disponibles en el espacio');

INSERT INTO roles (code, name, description, is_system) VALUES
  ('docente',       'Docentes',      'Aparta salones, ve el calendario y genera reportes',              true),
  ('administrador', 'Administrador', 'Acceso total: usuarios, roles, salones, reservas y reportes',     true),
  ('directora',     'Directora',     'Consulta el historial de todo y genera reportes de anomalías',    true),
  ('mantenimiento', 'Mantenimiento', 'Aparta salones y atiende reportes (historial y cambio de estado)', true),
  ('prefectura',    'Prefectura',    'Aparta salones y cancela reservas de cualquier usuario',          true);

INSERT INTO permissions (code, description) VALUES
  ('users.view',              'Ver usuarios'),
  ('users.manage',            'Crear, editar y desactivar usuarios'),
  ('roles.manage',            'Crear, editar y eliminar roles y sus permisos'),
  ('rooms.view',              'Ver salones'),
  ('rooms.manage',            'Crear y editar salones y su equipo'),
  ('calendar.view',           'Ver en el calendario los horarios ocupados'),
  ('reservations.create',     'Apartar un salón'),
  ('reservations.view_all',   'Ver el historial de reservas de todos los usuarios'),
  ('reservations.cancel_any', 'Cancelar reservas de cualquier usuario'),
  ('reservations.manage',     'Modificar cualquier reserva'),
  ('reports.create',          'Generar reportes de anomalías'),
  ('reports.view_history',    'Ver el historial de reportes con urgencia y todos los detalles'),
  ('reports.update_status',   'Cambiar el estado: pendiente, en proceso, resuelto'),
  ('reports.manage',          'Editar, asignar y eliminar cualquier reporte'),
  ('data.view',               'Consultar información y estadísticas');

-- Docentes: reservar, calendario y generar reportes (sin ver historial)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'rooms.view','calendar.view','reservations.create','reports.create'
) WHERE r.code = 'docente';

-- Administrador: todos los permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'administrador'
ON CONFLICT DO NOTHING;  -- el trigger ya se los asigna al insertar cada permiso

-- Directora: consulta el historial de todo y genera reportes; no reserva
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'users.view','rooms.view','calendar.view','reservations.view_all',
  'reports.create','reports.view_history','data.view'
) WHERE r.code = 'directora';

-- Mantenimiento: reserva y calendario como docente; historial de reportes y cambio de estado; NO genera reportes
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'rooms.view','calendar.view','reservations.create',
  'reports.view_history','reports.update_status'
) WHERE r.code = 'mantenimiento';

-- Prefectura: reserva y cancela reservas de cualquier usuario
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'rooms.view','calendar.view','reservations.create',
  'reservations.view_all','reservations.cancel_any'
) WHERE r.code = 'prefectura';

-- =====================================================================
-- VISTA ÚTIL PARA EL BACKEND: permisos efectivos por usuario
-- SELECT permission FROM user_permissions WHERE user_id = $1;
-- =====================================================================
CREATE VIEW user_permissions AS
SELECT u.id AS user_id, p.code AS permission
FROM users u
JOIN role_permissions rp ON rp.role_id = u.role_id
JOIN permissions p       ON p.id = rp.permission_id
WHERE u.active;

-- ¿Tiene el usuario este permiso?  SELECT has_permission(1, 'reports.create');
CREATE FUNCTION has_permission(p_user_id bigint, p_code text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM user_permissions WHERE user_id = p_user_id AND permission = p_code);
$$ LANGUAGE sql STABLE;

-- Calendario: horarios ocupados SIN datos de quién reservó
CREATE VIEW room_occupancy AS
SELECT room_id, date, start_time, end_time
FROM reservations
WHERE status = 'confirmada';

-- Reportes: resolved_at se llena solo al pasar a 'resuelto'
CREATE FUNCTION set_report_resolved_at() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'resuelto' AND OLD.status <> 'resuelto' THEN
    NEW.resolved_at = now();
  ELSIF NEW.status <> 'resuelto' THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reports_resolved BEFORE UPDATE OF status ON reports
  FOR EACH ROW EXECUTE FUNCTION set_report_resolved_at();