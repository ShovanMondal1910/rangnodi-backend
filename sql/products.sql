-- ============================================================================
-- Database Tables: products & product_images (PostgreSQL)
-- Customization:
--   1. Main showcase photo stored directly as binary (BYTEA)
--   2. Additional detailed photos stored as binary in product_images (BYTEA)
--   3. Foreign key on delete cascade for detailed photos
-- ============================================================================

BEGIN;

-- 1. Create Enums if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_status_enum') THEN
        CREATE TYPE stock_status_enum AS ENUM ('in_stock', 'out_of_stock', 'pre_order');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status_enum') THEN
        CREATE TYPE product_status_enum AS ENUM ('active', 'inactive', 'draft');
    END IF;
END $$;

-- 2. Trigger Function for updated_at auto-refresh (if not exists)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS products (
    product_id          VARCHAR(10) PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL UNIQUE,
    sku                 VARCHAR(100) UNIQUE,
    
    -- Categorization & Hierarchy
    category_id         VARCHAR(10) NOT NULL,
    subcategory_id      VARCHAR(10) DEFAULT NULL,
    brand               VARCHAR(100) DEFAULT 'Rangnodi',
    
    -- Pricing in BDT
    regular_price       NUMERIC(10, 2) NOT NULL,
    sale_price          NUMERIC(10, 2) DEFAULT NULL,
    
    -- Inventory & Limits
    stock_quantity      INTEGER NOT NULL DEFAULT 10,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    stock_status        stock_status_enum NOT NULL DEFAULT 'in_stock',
    max_purchase_limit  INTEGER NOT NULL DEFAULT 5,
    
    -- Delivery & Courier Logistics (Pathao / Steadfast / COD)
    weight_kg           NUMERIC(6, 2) NOT NULL DEFAULT 0.50,
    free_shipping       BOOLEAN NOT NULL DEFAULT FALSE,
    is_cod_available    BOOLEAN NOT NULL DEFAULT TRUE,
    warranty_period     VARCHAR(100) DEFAULT '7-Day Easy Replacement',
    
    -- 1. MAIN SHOWCASE PHOTO (Stored directly as Binary)
    main_image_blob     BYTEA DEFAULT NULL,
    main_image_mime     VARCHAR(50) DEFAULT 'image/jpeg',
    
    -- Descriptions & Details
    short_description   VARCHAR(500) DEFAULT NULL,
    description         TEXT DEFAULT NULL,
    
    -- Variants & Search Tags
    sizes               TEXT[] DEFAULT '{}',
    colors              TEXT[] DEFAULT '{}',
    tags                TEXT[] DEFAULT '{}',
    
    -- Cached Social Proof & Performance Metrics
    rating_avg          NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    rating_count        INTEGER NOT NULL DEFAULT 0,
    sales_count         INTEGER NOT NULL DEFAULT 0,
    views_count         INTEGER NOT NULL DEFAULT 0,
    
    -- Visibility & Badges
    badge               VARCHAR(50) DEFAULT NULL,
    is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
    flash_deal_end      TIMESTAMPTZ DEFAULT NULL,
    status              product_status_enum NOT NULL DEFAULT 'active',
    
    -- Soft Delete & Timestamps
    deleted_at          TIMESTAMPTZ DEFAULT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Validation Constraints
    CONSTRAINT chk_product_id_format CHECK (product_id ~ '^[0-9]{10}$'),
    CONSTRAINT chk_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT chk_regular_price_positive CHECK (regular_price >= 0),
    CONSTRAINT chk_sale_price CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price <= regular_price)),
    CONSTRAINT chk_stock_quantity_non_negative CHECK (stock_quantity >= 0),

    -- Foreign Key Constraints
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES categories (category_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_products_subcategory
        FOREIGN KEY (subcategory_id)
        REFERENCES subcategories (subcategory_id)
        ON DELETE SET NULL
);

-- 4. Attach Auto-update Trigger
DROP TRIGGER IF EXISTS trg_products_set_updated_at ON products;
CREATE TRIGGER trg_products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 5. Comments for Documentation
COMMENT ON TABLE products IS 'Main e-commerce products table with binary main photo storage';
COMMENT ON COLUMN products.product_id IS '10-digit unique numeric identifier';
COMMENT ON COLUMN products.main_image_blob IS 'Raw binary data for the primary showcase photo';
COMMENT ON COLUMN products.main_image_mime IS 'MIME type of binary image (e.g. image/jpeg, image/png, image/webp)';

-- 6. DETAILED PHOTOS TABLE (Gallery photos stored as Binary)
CREATE TABLE IF NOT EXISTS product_images (
    image_id            VARCHAR(10) PRIMARY KEY,
    product_id          VARCHAR(10) NOT NULL,
    image_blob          BYTEA NOT NULL,
    image_mime          VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key: Automatically deletes detailed photos when parent product is deleted
    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id)
        REFERENCES products (product_id)
        ON DELETE CASCADE,

    -- Validation Constraints
    CONSTRAINT chk_image_id_format
        CHECK (image_id ~ '^[0-9]{10}$'),
    CONSTRAINT chk_image_sort_order_non_negative
        CHECK (sort_order >= 0)
);

COMMENT ON TABLE product_images IS 'Additional detailed photos stored directly as binary';
COMMENT ON COLUMN product_images.image_blob IS 'Raw binary data for the detailed gallery photo';

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_cat_status ON products (category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_subcat ON products (subcategory_id, status);
CREATE INDEX IF NOT EXISTS idx_products_pricing ON products (sale_price, regular_price);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (is_featured, status);
CREATE INDEX IF NOT EXISTS idx_products_sales ON products (sales_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prod_images_product_id ON product_images (product_id, sort_order ASC);

-- GIN Indexes for fast array searches (filtering by size, color, or tag)
CREATE INDEX IF NOT EXISTS idx_products_sizes ON products USING GIN (sizes);
CREATE INDEX IF NOT EXISTS idx_products_colors ON products USING GIN (colors);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

COMMIT;