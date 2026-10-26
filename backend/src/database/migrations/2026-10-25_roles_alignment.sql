-- =====================================================================
-- UIN Space — roles alignment migration
-- Brings an existing database in line with uin_space.sql:
--   - roles.updated_at
--   - permissions.is_system + protection trigger
--   - only two system roles (administrador, mantenimiento)
--   - system roles can no longer be renamed
--   - unique role names
-- Idempotent: safe to run more than once.
-- =====================================================================

-- Roles keep an updated_at like the rest of the tables
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_roles_updated ON roles;
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Base permissions: their key is what the system looks up, so it cannot change
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION protect_system_permissions() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'El permiso "%" es base y no se puede eliminar', OLD.code;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.is_system AND NEW.code <> OLD.code THEN
    RAISE EXCEPTION 'El permiso base "%" no se puede renombrar', OLD.code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_permissions_protect_system ON permissions;
CREATE TRIGGER trg_permissions_protect_system BEFORE UPDATE OR DELETE ON permissions
  FOR EACH ROW EXECUTE FUNCTION protect_system_permissions();

-- The whole seeded catalog is base
UPDATE permissions SET is_system = true;

-- Removing a permission from the administrator is blocked, but deleting the
-- permission itself (ON DELETE CASCADE) must stay possible: pg_trigger_depth()
-- is 1 on a direct delete and 2 when the delete comes from the cascade.
CREATE OR REPLACE FUNCTION protect_admin_permissions() RETURNS trigger AS $$
BEGIN
  IF pg_trigger_depth() = 1
     AND EXISTS (SELECT 1 FROM roles WHERE id = OLD.role_id AND code = 'administrador') THEN
    RAISE EXCEPTION 'No se pueden quitar permisos al rol Administrador';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Only these two roles belong to the system.
-- The old trigger forbids demoting a role, so it is dropped while the rows change.
DROP TRIGGER IF EXISTS trg_roles_protect ON roles;

UPDATE roles SET is_system = (code IN ('administrador', 'mantenimiento'));

CREATE OR REPLACE FUNCTION protect_system_roles() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'El rol "%" es del sistema y no se puede eliminar', OLD.name;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.is_system AND (NEW.code <> OLD.code OR NEW.name <> OLD.name OR NEW.is_system = false) THEN
    RAISE EXCEPTION 'El rol "%" es del sistema y no se puede renombrar ni cambiar su código', OLD.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roles_protect BEFORE UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION protect_system_roles();

-- Role names are unique (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_lower_uq ON roles (lower(name));
