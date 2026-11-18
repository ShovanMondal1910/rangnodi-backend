-- ============================================================================
-- Database Table: users
-- Project: Rangnodi E-Commerce (PostgreSQL)
-- Description: Supports local registration/sign-up & Google OAuth login
-- ============================================================================

BEGIN;

-- 1. Create Enums if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('customer', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');
    END IF;
END $$;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id                 VARCHAR(10) PRIMARY KEY,
    fullname                VARCHAR(100) NOT NULL,
    email                   VARCHAR(191) NOT NULL UNIQUE,
    password                VARCHAR(255) DEFAULT NULL,
    avatar_blob             BYTEA DEFAULT NULL,
    avatar_mime             VARCHAR(50) DEFAULT 'image/jpeg',
    phone                   VARCHAR(20) DEFAULT NULL,
    role                    user_role NOT NULL DEFAULT 'customer',
    status                  user_status NOT NULL DEFAULT 'active',
    
    -- Social Login / OAuth details
    oauth_provider          VARCHAR(20) NOT NULL DEFAULT 'local',
    oauth_id                VARCHAR(100) DEFAULT NULL,
    
    -- Verification & Recovery
    email_verified_at       TIMESTAMPTZ DEFAULT NULL,
    remember_token          VARCHAR(100) DEFAULT NULL,
    reset_token_hash        VARCHAR(64) DEFAULT NULL,
    reset_token_expires_at  TIMESTAMPTZ DEFAULT NULL,
    
    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_id_format CHECK (user_id ~ '^[0-9]{10}$'),
    CONSTRAINT chk_users_email_not_empty CHECK (length(trim(email)) > 0)
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users (oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users (reset_token_hash);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- 4. Trigger for automatic updated_at refresh
DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 5. Seed Default Admin Account
INSERT INTO users (
    user_id, fullname, email, password, phone, role, status, email_verified_at
) VALUES (
    '1000000001',
    'System Administrator',
    'admin@rangnodi.com',
    '$2y$12$iXkICvCQe3DQeUQ6luFTsO5NUDu.e5s7e7U7ZzIfcqCMnBJNVdSRa',
    '01700000000',
    'admin',
    'active',
    CURRENT_TIMESTAMP
)
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    status = 'active',
    password = EXCLUDED.password;

COMMIT;
