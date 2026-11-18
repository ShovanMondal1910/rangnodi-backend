import pool from '../config/database';
import { CartItemRow, AddToCartDto, SyncCartItemDto } from '../types/cart.types';

export class CartService {
  /**
   * Get all cart items for a user with product metadata
   * Also purges cart items that have not been touched for 7 days
   */
  async getCart(userId: string) {
    // 1. Purge items older than 7 days without user activity
    await pool.query(
      "DELETE FROM cart_items WHERE updated_at < NOW() - INTERVAL '7 days'"
    );

    // 2. Refresh active timestamp for current user's cart
    await pool.query(
      "UPDATE cart_items SET updated_at = NOW() WHERE user_id = $1",
      [userId]
    );

    const query = `
      SELECT 
        c.id,
        c.user_id,
        c.product_id,
        c.quantity,
        c.selected_size,
        c.selected_color,
        c.created_at,
        c.updated_at,
        p.title,
        p.slug,
        p.sku,
        p.regular_price,
        p.sale_price,
        p.stock_quantity,
        p.stock_status,
        (p.main_image_blob IS NOT NULL) AS has_image
      FROM cart_items c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC;
    `;

    const res = await pool.query<CartItemRow>(query, [userId]);
    const items = res.rows.map(row => ({
      ...row,
      regular_price: Number(row.regular_price),
      sale_price: row.sale_price !== null ? Number(row.sale_price) : null,
      unit_price: row.sale_price !== null ? Number(row.sale_price) : Number(row.regular_price),
      image_url: row.has_image ? `/api/v1/products/${row.product_id}/main-image` : null,
    }));

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    return {
      items,
      total_items: items.length,
      total_quantity: totalQuantity,
      subtotal: Math.round(subtotal * 100) / 100,
    };
  }

  /**
   * Add item to user's cart (or increment quantity if already present)
   */
  async addToCart(dto: AddToCartDto) {
    const size = dto.selected_size || null;
    const color = dto.selected_color || null;
    const qty = Math.max(1, dto.quantity || 1);

    // Verify product exists and is active
    const prodRes = await pool.query('SELECT product_id, stock_quantity, stock_status FROM products WHERE product_id = $1', [dto.product_id]);
    if (prodRes.rowCount === 0) {
      throw new Error('Product not found');
    }

    const upsertQuery = `
      INSERT INTO cart_items (user_id, product_id, quantity, selected_size, selected_color, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, product_id, COALESCE(selected_size, ''), COALESCE(selected_color, ''))
      DO UPDATE SET 
        quantity = cart_items.quantity + EXCLUDED.quantity,
        updated_at = NOW()
      RETURNING id, user_id, product_id, quantity, selected_size, selected_color;
    `;

    // Note: To handle NULL in unique constraint smoothly, we can do an explicit check or standard upsert
    const checkQuery = `
      SELECT id, quantity 
      FROM cart_items 
      WHERE user_id = $1 
        AND product_id = $2 
        AND (selected_size IS NOT DISTINCT FROM $3)
        AND (selected_color IS NOT DISTINCT FROM $4)
      LIMIT 1;
    `;

    const existing = await pool.query(checkQuery, [dto.user_id, dto.product_id, size, color]);

    if (existing.rowCount && existing.rowCount > 0) {
      const newQty = existing.rows[0].quantity + qty;
      await pool.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQty, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity, selected_size, selected_color)
         VALUES ($1, $2, $3, $4, $5)`,
        [dto.user_id, dto.product_id, qty, size, color]
      );
    }

    return this.getCart(dto.user_id);
  }

  /**
   * Update quantity of a specific cart item
   */
  async updateQuantity(userId: string, cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeFromCart(userId, cartItemId);
    }

    await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
      [quantity, cartItemId, userId]
    );

    return this.getCart(userId);
  }

  /**
   * Remove a single item from user's cart
   */
  async removeFromCart(userId: string, cartItemId: string) {
    await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [cartItemId, userId]
    );

    return this.getCart(userId);
  }

  /**
   * Clear all items from user's cart
   */
  async clearCart(userId: string) {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    return { items: [], total_items: 0, total_quantity: 0, subtotal: 0 };
  }

  /**
   * Sync guest localStorage cart into database upon user login
   */
  async syncGuestCart(userId: string, items: SyncCartItemDto[]) {
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          await this.addToCart({
            user_id: userId,
            product_id: item.product_id,
            quantity: item.quantity,
            selected_size: item.selected_size,
            selected_color: item.selected_color,
          });
        }
      }
    }
    return this.getCart(userId);
  }
}

export const cartService = new CartService();
