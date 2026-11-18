import { Request, Response } from 'express';
import { orderService } from '../services/order.service';

export class OrderController {
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.body.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required: You must be logged in to place an order.'
        });
        return;
      }
      const result = await orderService.createOrder(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to place order' });
    }
  }

  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await orderService.getOrderById(id);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || 'Order not found' });
    }
  }

  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required' });
        return;
      }
      const orders = await orderService.getUserOrders(userId);
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as string;
      const search = req.query.search as string;
      const orders = await orderService.getAllOrders({ status, search });
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch orders' });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { orderStatus, paymentStatus } = req.body;
      if (!orderStatus) {
        res.status(400).json({ success: false, message: 'orderStatus is required' });
        return;
      }
      const updated = await orderService.updateOrderStatus(id, orderStatus, paymentStatus);
      res.status(200).json({ success: true, data: updated, message: 'Order status updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to update order status' });
    }
  }

  async deleteOrder(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await orderService.deleteOrder(id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to delete order' });
    }
  }
}

export const orderController = new OrderController();
