import pool from '../config/database';
import { CreateOrderDto } from '../types/order.types';
import { cartService } from './cart.service';

export class OrderService {
  /**
   * Generates a unique readable Order Number e.g. RN-261118-4912
   */
  private generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RN-${dateStr}-${rand}`;
  }

  async createOrder(dto: CreateOrderDto) {
    const userId = dto.userId || null;
    if (!userId) {
      throw new Error('Authentication required: You must be logged in to place an order.');
    }
    const orderId = this.generateOrderNumber();
    const firstName = (dto.firstName || '').trim();
    const lastName = (dto.lastName || '').trim();
    const customerName = dto.customerName?.trim() || `${firstName} ${lastName}`.trim();
    const phone = (dto.phone || '').trim();
    const email = (dto.email || '').trim();
    const deliveryAddress = (dto.deliveryAddress || '').trim();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const insertOrderSql = `
        INSERT INTO orders (
          order_id, user_id,
          first_name, last_name, customer_name, phone, email, delivery_address,
          subtotal, shipping_charge, discount_amount, vat_amount, rounding_off, total_amount,
          payment_method, payment_status, order_status
        ) VALUES (
          $1, $2,
          $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, 'pending', 'processing'
        ) RETURNING *;
      `;

      const orderRes = await client.query(insertOrderSql, [
        orderId,
        userId,
        firstName,
        lastName || null,
        customerName,
        phone,
        email,
        deliveryAddress,
        dto.subtotal || 0,
        dto.shippingCharge || 0,
        dto.discountAmount || 0,
        dto.vatAmount || 0,
        dto.roundingOff || 0,
        dto.totalAmount || 0,
        dto.paymentMethod || 'cod'
      ]);

      const insertedOrder = orderRes.rows[0];

      // Insert Order Items
      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          await client.query(`
            INSERT INTO order_items (
              order_id, product_id, product_title, sku, selected_size, selected_color,
              unit_price, vat, discount, quantity, total_price
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            );
          `, [
            orderId,
            item.productId,
            item.productTitle,
            item.sku || null,
            item.selectedSize || null,
            item.selectedColor || null,
            item.unitPrice,
            item.vat || 0,
            item.discount || 0,
            item.quantity,
            item.totalPrice
          ]);
        }
      }

      // If logged in, clear cart in PostgreSQL
      if (userId) {
        await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
      }

      await client.query('COMMIT');

      return {
        order: insertedOrder,
        orderId,
        message: 'Order created successfully'
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getOrderById(orderId: string) {
    const orderRes = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
    if (orderRes.rowCount === 0) {
      throw new Error(`Order ${orderId} not found`);
    }
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    const orderData = orderRes.rows[0];
    const itemsData = itemsRes.rows.map(row => ({
      ...row,
      image_url: `/api/v1/products/${row.product_id}/main-image`
    }));
    return {
      ...orderData,
      items: itemsData
    };
  }

  async getUserOrders(userId: string) {
    const query = `
      SELECT 
        o.order_id,
        o.user_id,
        o.first_name,
        o.last_name,
        o.customer_name,
        o.phone,
        o.email,
        o.delivery_address,
        o.subtotal,
        o.shipping_charge,
        o.discount_amount,
        o.vat_amount,
        o.rounding_off,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.created_at,
        o.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_title', oi.product_title,
              'sku', oi.sku,
              'selected_size', oi.selected_size,
              'selected_color', oi.selected_color,
              'unit_price', oi.unit_price,
              'quantity', oi.quantity,
              'total_price', oi.total_price,
              'image_url', '/api/v1/products/' || oi.product_id || '/main-image'
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.order_id
      ORDER BY o.created_at DESC;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  async getAllOrders(filters?: { status?: string; search?: string }) {
    let whereClause = '1=1';
    const params: any[] = [];

    if (filters?.status && filters.status !== 'all') {
      params.push(filters.status.toLowerCase());
      whereClause += ` AND LOWER(o.order_status) = $${params.length}`;
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      params.push(term);
      const idx = params.length;
      whereClause += ` AND (
        LOWER(o.order_id) LIKE $${idx} OR
        LOWER(o.customer_name) LIKE $${idx} OR
        LOWER(o.phone) LIKE $${idx} OR
        LOWER(o.email) LIKE $${idx} OR
        LOWER(o.delivery_address) LIKE $${idx}
      )`;
    }

    const query = `
      SELECT 
        o.order_id,
        o.user_id,
        o.first_name,
        o.last_name,
        o.customer_name,
        o.phone,
        o.email,
        o.delivery_address,
        o.subtotal,
        o.shipping_charge,
        o.discount_amount,
        o.vat_amount,
        o.rounding_off,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.created_at,
        o.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_title', oi.product_title,
              'sku', oi.sku,
              'selected_size', oi.selected_size,
              'selected_color', oi.selected_color,
              'unit_price', oi.unit_price,
              'quantity', oi.quantity,
              'total_price', oi.total_price,
              'image_url', '/api/v1/products/' || oi.product_id || '/main-image'
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE ${whereClause}
      GROUP BY o.order_id
      ORDER BY o.created_at DESC;
    `;
    const res = await pool.query(query, params);
    return res.rows;
  }

  async updateOrderStatus(orderId: string, orderStatus: string, paymentStatus?: string) {
    const query = `
      UPDATE orders
      SET order_status = $2,
          payment_status = COALESCE($3, payment_status),
          updated_at = NOW()
      WHERE order_id = $1
      RETURNING *;
    `;
    const res = await pool.query(query, [orderId, orderStatus, paymentStatus || null]);
    if (res.rowCount === 0) {
      throw new Error(`Order ${orderId} not found`);
    }
    return res.rows[0];
  }

  async deleteOrder(orderId: string) {
    const res = await pool.query('DELETE FROM orders WHERE order_id = $1 RETURNING order_id', [orderId]);
    if (res.rowCount === 0) {
      throw new Error(`Order ${orderId} not found`);
    }
    return { orderId, message: 'Order deleted successfully' };
  }
}

export const orderService = new OrderService();
