-- ============================================================================
-- Seed initial catalog data to match the UI screenshot
-- ============================================================================

BEGIN;

-- Insert Categories
INSERT INTO categories (category_id, name, slug, badge, is_highlighted, sort_order, status)
VALUES
    ('6257096818', 'SALE/27', 'sale-27', 'HOT', TRUE, 1, 'active'),
    ('5404028831', 'NEW IN', 'new-in', 'NEW', TRUE, 2, 'active'),
    ('8578399821', 'MEN', 'men', NULL, FALSE, 3, 'active'),
    ('8282104133', 'WOMEN', 'women', NULL, FALSE, 4, 'active'),
    ('4226959783', 'KID', 'kid', NULL, FALSE, 5, 'active'),
    ('4515262865', 'NEWBORN', 'newborn', NULL, FALSE, 6, 'active'),
    ('8828998234', 'FOOTWEAR', 'footwear', NULL, FALSE, 7, 'active'),
    ('4483659348', 'ACCESSORIES', 'accessories', NULL, FALSE, 8, 'active'),
    ('9623547003', 'HOME & GIFT', 'home-gift', NULL, FALSE, 9, 'active')
ON CONFLICT (category_id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    badge = EXCLUDED.badge,
    is_highlighted = EXCLUDED.is_highlighted,
    sort_order = EXCLUDED.sort_order,
    status = EXCLUDED.status;

-- Insert Sample Subcategories for MEN
INSERT INTO subcategories (subcategory_id, category_id, group_name, name, slug, sort_order, status)
VALUES
    ('1029384756', '8578399821', 'Ethnic Wear', 'Panjabi & Kurta', 'panjabi-kurta', 1, 'active'),
    ('2938475610', '8578399821', 'Ethnic Wear', 'Kabli Sets', 'kabli-sets', 2, 'active'),
    ('3847561029', '8578399821', 'Western Wear', 'Casual Shirts', 'casual-shirts', 3, 'active'),
    ('4756102938', '8578399821', 'Western Wear', 'Formal Shirts', 'formal-shirts', 4, 'active'),
    ('5610293847', '8578399821', 'Western Wear', 'Polo & T-Shirts', 'polo-t-shirts', 5, 'active'),
    ('6102938475', '8578399821', 'Bottoms', 'Chinos & Trousers', 'chinos-trousers', 6, 'active'),
    ('7029384756', '8578399821', 'Bottoms', 'Denim Jeans', 'denim-jeans', 7, 'active')
ON CONFLICT (subcategory_id) DO NOTHING;

-- Insert Sample Subcategories for WOMEN
INSERT INTO subcategories (subcategory_id, category_id, group_name, name, slug, sort_order, status)
VALUES
    ('8129384756', '8282104133', 'Ethnic', 'Sarees & Lehengas', 'sarees-lehengas', 1, 'active'),
    ('9238475610', '8282104133', 'Ethnic', 'Salwar Kameez', 'salwar-kameez', 2, 'active'),
    ('1347561029', '8282104133', 'Western', 'Tops & Tunics', 'tops-tunics', 3, 'active'),
    ('2456102938', '8282104133', 'Western', 'Dresses & Jumpsuits', 'dresses-jumpsuits', 4, 'active')
ON CONFLICT (subcategory_id) DO NOTHING;

-- Insert Sample Subcategories for SALE/27
INSERT INTO subcategories (subcategory_id, category_id, group_name, name, slug, sort_order, status)
VALUES
    ('3567890123', '6257096818', 'Campaign Specials', 'Flat 50% Off', 'flat-50-off', 1, 'active'),
    ('4678901234', '6257096818', 'Campaign Specials', 'Festive Clearance', 'festive-clearance', 2, 'active')
ON CONFLICT (subcategory_id) DO NOTHING;

COMMIT;
