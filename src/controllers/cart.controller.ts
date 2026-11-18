import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';

const extractUserId = (req: Request): string => {
  if (req.body?.userId && typeof req.body.userId === 'string') return req.body.userId;
  if (req.query?.userId && typeof req.query.userId === 'string') return req.query.userId;
  const header = req.headers['x-user-id'];
  if (Array.isArray(header)) return header[0] || '';
  return header || '';
};

export class CartController {
  async getCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req);
      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required' });
        return;
      }

      const cart = await cartService.getCart(userId);
      res.status(200).json({ success: true, data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async addToCart(req: Request, res: Response): Promise<void> {
    try {
      const { productId, quantity, selectedSize, selectedColor } = req.body;
      const targetUserId = extractUserId(req);

      if (!targetUserId || !productId) {
        res.status(400).json({ success: false, message: 'userId and productId are required' });
        return;
      }

      const cart = await cartService.addToCart({
        user_id: targetUserId,
        product_id: productId,
        quantity: quantity ? Number(quantity) : 1,
        selected_size: selectedSize,
        selected_color: selectedColor,
      });

      res.status(200).json({ success: true, message: 'Item added to cart', data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateQuantity(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { quantity } = req.body;
      const targetUserId = extractUserId(req);

      if (!targetUserId || !id) {
        res.status(400).json({ success: false, message: 'userId and cartItemId are required' });
        return;
      }

      const cart = await cartService.updateQuantity(targetUserId, id, Number(quantity));
      res.status(200).json({ success: true, message: 'Quantity updated', data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async removeFromCart(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = extractUserId(req);

      if (!userId || !id) {
        res.status(400).json({ success: false, message: 'userId and cartItemId are required' });
        return;
      }

      const cart = await cartService.removeFromCart(userId, id);
      res.status(200).json({ success: true, message: 'Item removed from cart', data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req);
      if (!userId) {
        res.status(400).json({ success: false, message: 'userId is required' });
        return;
      }

      const cart = await cartService.clearCart(userId);
      res.status(200).json({ success: true, message: 'Cart cleared', data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async syncGuestCart(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body;
      const targetUserId = extractUserId(req);

      if (!targetUserId) {
        res.status(400).json({ success: false, message: 'userId is required' });
        return;
      }

      const cart = await cartService.syncGuestCart(targetUserId, items || []);
      res.status(200).json({ success: true, message: 'Guest cart synced successfully', data: cart });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const cartController = new CartController();
