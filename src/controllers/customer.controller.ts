import { Request, Response } from 'express';
import { customerService } from '../services/customer.service';

export class CustomerController {
  async generateId(req: Request, res: Response) {
    try {
      const id = await customerService.generateUniqueCustomerId();
      return res.status(200).json({
        success: true,
        data: { id },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate Customer ID',
      });
    }
  }

  async getAllCustomers(req: Request, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;

      const customers = await customerService.getAllCustomers(search, status);
      return res.status(200).json({
        success: true,
        data: customers,
        total: customers.length,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch customers',
      });
    }
  }

  async getCustomerById(req: Request, res: Response) {
    try {
      const customer = await customerService.getCustomerById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Customer not found',
      });
    }
  }

  async getAvatar(req: Request, res: Response) {
    try {
      const avatar = await customerService.getCustomerAvatar(req.params.id as string);
      if (!avatar || !avatar.blob) {
        return res.status(404).json({
          success: false,
          message: 'Avatar image not found',
        });
      }

      res.setHeader('Content-Type', avatar.mime || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours caching
      return res.send(avatar.blob);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve avatar',
      });
    }
  }

  async createCustomer(req: Request, res: Response) {
    try {
      const newCustomer = await customerService.createCustomer(req.body);
      return res.status(201).json({
        success: true,
        data: newCustomer,
        message: 'Customer account created successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create customer',
      });
    }
  }

  async updateCustomer(req: Request, res: Response) {
    try {
      const updated = await customerService.updateCustomer(req.params.id as string, req.body);
      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Customer account updated successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update customer',
      });
    }
  }

  async deleteCustomer(req: Request, res: Response) {
    try {
      await customerService.deleteCustomer(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: 'Customer account deleted successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete customer',
      });
    }
  }
}

export const customerController = new CustomerController();
