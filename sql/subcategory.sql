-- ============================================================================
-- Description: Subcategories Table DDL (PostgreSQL)
-- Features:
--   - subcategory_id Primary Key (enforced 10-digit format)
--   - category_id Foreign Key (references categories.category_id ON DELETE CASCADE)
--   - Group / Column header support (e.g. Ethnic, Western, Outerwear)
--   - Custom status ENUM & automatic updated_at trigger
--   - High-performance composite & partial indexes
-- ============================================================================

BEGIN;

-- 1. Create Enum Type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subcategory_status') THEN
        CREATE TYPE subcategory_status AS ENUM ('active', 'inactive');
    END IF;
END $$;

-- 2. Trigger Function for updated_at auto-refresh (if not already created)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Table
CREATE TABLE IF NOT EXISTS subcategories (
    subcategory_id  VARCHAR(10) PRIMARY KEY,
    category_id     VARCHAR(10) NOT NULL,
    group_name      VARCHAR(100) DEFAULT 'Main Collection',
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    status          subcategory_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraint
    CONSTRAINT fk_subcategories_category 
        FOREIGN KEY (category_id) 
        REFERENCES categories (category_id) 
        ON DELETE CASCADE,

    -- Ensure unique slug per category
    CONSTRAINT uq_subcategories_category_slug 
        UNIQUE (category_id, slug),

    -- Data integrity check constraints
    CONSTRAINT chk_subcategory_id_format 
        CHECK (subcategory_id ~ '^[0-9]{10}$'),
    CONSTRAINT chk_subcat_name_not_empty 
        CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_subcat_slug_format 
        CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT chk_subcat_sort_order_non_negative 
        CHECK (sort_order >= 0)
);

-- 4. Attach Auto-update Trigger
DROP TRIGGER IF EXISTS trg_subcategories_set_updated_at ON subcategories;
CREATE TRIGGER trg_subcategories_set_updated_at
BEFORE UPDATE ON subcategories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 5. Comments for Documentation / Schema Introspection
COMMENT ON TABLE subcategories IS 'Stores subcategories grouped under parent categories';
COMMENT ON COLUMN subcategories.subcategory_id IS '10-digit unique numeric identifier (Primary Key)';
COMMENT ON COLUMN subcategories.category_id IS 'Foreign key referencing parent categories.category_id';
COMMENT ON COLUMN subcategories.group_name IS 'Column/Group Header e.g. Ethnic, Western, Outerwear';
COMMENT ON COLUMN subcategories.name IS 'Display name of the subcategory';
COMMENT ON COLUMN subcategories.slug IS 'URL-friendly slug (unique within category)';
COMMENT ON COLUMN subcategories.sort_order IS 'Ordering priority within the category/group (ascending)';
COMMENT ON COLUMN subcategories.status IS 'Visibility status: active or inactive';
COMMENT ON COLUMN subcategories.created_at IS 'Record creation timestamp (UTC)';
COMMENT ON COLUMN subcategories.updated_at IS 'Record last modified timestamp (UTC)';

-- 6. Indexes for High-Performance Queries
-- Foreign key index (crucial for join performance and cascading deletes)
CREATE INDEX IF NOT EXISTS idx_subcat_category_id 
    ON subcategories (category_id);

-- Composite index for category + status filtering
CREATE INDEX IF NOT EXISTS idx_subcat_cat_status 
    ON subcategories (category_id, status);

-- Composite index for group-based mega-menu listings
CREATE INDEX IF NOT EXISTS idx_subcat_cat_group_sort 
    ON subcategories (category_id, group_name, sort_order ASC);

-- Case-insensitive lookup optimization for subcategory slugs
CREATE INDEX IF NOT EXISTS idx_subcat_category_slug_lower 
    ON subcategories (category_id, LOWER(slug));

-- High-speed Partial Index for active subcategories (public shop/nav menu)
CREATE INDEX IF NOT EXISTS idx_subcat_active_nav 
    ON subcategories (category_id, sort_order ASC) 
    WHERE status = 'active';

COMMIT;
