-- ============================================================================
-- Description: Categories Table DDL (PostgreSQL)
-- Features: 
--   - Custom ENUM status type
--   - Enforced constraints (10-digit ID, kebab-case slug, non-empty name)
--   - Automatic `updated_at` trigger
--   - Production-optimized partial and composite indexes
-- ============================================================================

BEGIN;

-- 1. Create Enum Type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_status') THEN
        CREATE TYPE category_status AS ENUM ('active', 'inactive');
    END IF;
END $$;

-- 2. Trigger Function for updated_at auto-refresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Table
CREATE TABLE IF NOT EXISTS categories (
    category_id     VARCHAR(10) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    badge           VARCHAR(50) DEFAULT NULL,
    is_highlighted  BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    status          category_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Data integrity check constraints
    CONSTRAINT chk_category_id_format 
        CHECK (category_id ~ '^[0-9]{10}$'),
    CONSTRAINT chk_name_not_empty 
        CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_slug_format 
        CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT chk_sort_order_non_negative 
        CHECK (sort_order >= 0)
);

-- 4. Attach Auto-update Trigger
DROP TRIGGER IF EXISTS trg_categories_set_updated_at ON categories;
CREATE TRIGGER trg_categories_set_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 5. Comments for Documentation / Schema Introspection
COMMENT ON TABLE categories IS 'Stores product and catalog categories';
COMMENT ON COLUMN categories.category_id IS '10-digit unique numeric identifier';
COMMENT ON COLUMN categories.name IS 'Display name of the category';
COMMENT ON COLUMN categories.slug IS 'URL-friendly unique kebab-case slug';
COMMENT ON COLUMN categories.badge IS 'Optional badge label (e.g., "New", "Hot", "Sale")';
COMMENT ON COLUMN categories.is_highlighted IS 'Flag to feature category on homepage/navigation';
COMMENT ON COLUMN categories.sort_order IS 'Ordering priority (ascending)';
COMMENT ON COLUMN categories.status IS 'Visibility status: active or inactive';
COMMENT ON COLUMN categories.created_at IS 'Record creation timestamp (UTC)';
COMMENT ON COLUMN categories.updated_at IS 'Record last modified timestamp (UTC)';

-- 6. Indexes for High-Performance Queries
-- Case-insensitive lookup optimization
CREATE UNIQUE INDEX IF NOT EXISTS uidx_categories_slug_lower 
    ON categories (LOWER(slug));

-- General lookup index for status filtering
CREATE INDEX IF NOT EXISTS idx_categories_status 
    ON categories (status);

-- Composite index for admin/catalog sorting by status and sort_order
CREATE INDEX IF NOT EXISTS idx_categories_status_sort_order 
    ON categories (status, sort_order ASC);

-- Highly-efficient Partial Index for active public navigation/menus
CREATE INDEX IF NOT EXISTS idx_categories_active_nav 
    ON categories (sort_order ASC) 
    WHERE status = 'active';

-- High-speed Partial Index for highlighted banner/homepage items
CREATE INDEX IF NOT EXISTS idx_categories_highlighted_active 
    ON categories (sort_order ASC) 
    WHERE is_highlighted = TRUE AND status = 'active';

COMMIT;
