-- ============================================================================
-- Database Tables: orders & order_items (PostgreSQL / Supabase)
-- Project: Rangnodi E-Commerce
-- Description: Streamlined customer orders, single delivery address & order items
-- ============================================================================

-- Ensure pgcrypto or uuid-ossp extension is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    order_id            VARCHAR(20) PRIMARY KEY,
    user_id             VARCHAR(10) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Customer & Delivery Details (Unified)
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) DEFAULT NULL,
    customer_name       VARCHAR(200) NOT NULL,
    phone               VARCHAR(25) NOT NULL,
    email               VARCHAR(191) NOT NULL,
    delivery_address    TEXT NOT NULL,
    
    -- Financials (BDT)
    subtotal            NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipping_charge     NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    vat_amount          NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rounding_off        NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount        NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Payment & Order Status
    payment_method      VARCHAR(50) NOT NULL DEFAULT 'cod',
    payment_status      VARCHAR(50) NOT NULL DEFAULT 'pending',
    order_status        VARCHAR(50) NOT NULL DEFAULT 'processing',
    
    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            VARCHAR(20) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id          VARCHAR(10) REFERENCES products(product_id) ON DELETE SET NULL,
    product_title       VARCHAR(255) NOT NULL,
    sku                 VARCHAR(100) DEFAULT NULL,
    selected_size       VARCHAR(50) DEFAULT NULL,
    selected_color      VARCHAR(50) DEFAULT NULL,
    unit_price          NUMERIC(10, 2) NOT NULL,
    vat                 NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount            NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity            INTEGER NOT NULL DEFAULT 1,
    total_price         NUMERIC(10, 2) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
