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

-- Delete existing sample subcategories for MEN to cleanly refresh
DELETE FROM subcategories WHERE category_id = '8578399821';

-- Insert Sample Subcategories for MEN matching the screenshot
INSERT INTO subcategories (subcategory_id, category_id, group_name, name, slug, sort_order, status)
VALUES
    -- TRADITIONAL & ETHNIC
    ('1029384756', '8578399821', 'TRADITIONAL & ETHNIC', 'Panjabis', 'panjabis', 1, 'active'),
    ('1029384757', '8578399821', 'TRADITIONAL & ETHNIC', 'Pajamas', 'pajamas', 2, 'active'),
    ('1029384758', '8578399821', 'TRADITIONAL & ETHNIC', 'Kabli Sets', 'kabli-sets', 3, 'active'),
    ('1029384759', '8578399821', 'TRADITIONAL & ETHNIC', 'Waistcoats', 'waistcoats', 4, 'active'),
    ('1029384760', '8578399821', 'TRADITIONAL & ETHNIC', 'Kurtas', 'kurtas', 5, 'active'),

    -- WESTERN WEAR
    ('2029384751', '8578399821', 'WESTERN WEAR', 'Casual Shirts', 'casual-shirts', 1, 'active'),
    ('2029384752', '8578399821', 'WESTERN WEAR', 'Formal Shirts', 'formal-shirts', 2, 'active'),
    ('2029384753', '8578399821', 'WESTERN WEAR', 'Polo Shirts', 'polo-shirts', 3, 'active'),
    ('2029384754', '8578399821', 'WESTERN WEAR', 'T-Shirts', 't-shirts', 4, 'active'),
    ('2029384755', '8578399821', 'WESTERN WEAR', 'Denim & Jeans', 'denim-jeans', 5, 'active'),
    ('2029384756', '8578399821', 'WESTERN WEAR', 'Chinos & Trousers', 'chinos-trousers', 6, 'active'),

    -- OUTERWEAR & LAYERING
    ('3029384751', '8578399821', 'OUTERWEAR & LAYERING', 'Jackets', 'jackets', 1, 'active'),
    ('3029384752', '8578399821', 'OUTERWEAR & LAYERING', 'Hoodies & Sweatshirts', 'hoodies-sweatshirts', 2, 'active'),
    ('3029384753', '8578399821', 'OUTERWEAR & LAYERING', 'Blazers & Suits', 'blazers-suits', 3, 'active'),

    -- ACCESSORIES
    ('4029384751', '8578399821', 'ACCESSORIES', 'Leather Belts', 'leather-belts', 1, 'active'),
    ('4029384752', '8578399821', 'ACCESSORIES', 'Wallets', 'wallets', 2, 'active'),
    ('4029384753', '8578399821', 'ACCESSORIES', 'Caps & Hats', 'caps-hats', 3, 'active')
ON CONFLICT (subcategory_id) DO UPDATE SET
    group_name = EXCLUDED.group_name,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    sort_order = EXCLUDED.sort_order,
    status = EXCLUDED.status;

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
