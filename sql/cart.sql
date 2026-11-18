-- ============================================================================
-- Database Table: cart_items (PostgreSQL)
-- Project: Rangnodi E-Commerce
-- Description: Persistent shopping cart items per user with product relations
-- ============================================================================

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(10) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id VARCHAR(10) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    selected_size VARCHAR(50) DEFAULT NULL,
    selected_color VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_cart_user_product_variant UNIQUE (user_id, product_id, selected_size, selected_color)
);

-- Quick lookups by user_id and expiration
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_updated_at ON cart_items(updated_at);
