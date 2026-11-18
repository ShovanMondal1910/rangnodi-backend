import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';

export class AdminController {
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch dashboard statistics',
      });
    }
  }

  async getAllAdmins(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const admins = await adminService.getAllAdmins(search, status);
      res.status(200).json({
        success: true,
        data: admins,
        total: admins.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch admins',
      });
    }
  }

  async getAdminById(req: Request, res: Response): Promise<void> {
    try {
      const admin = await adminService.getAdminById(req.params.id);
      res.status(200).json({
        success: true,
        data: admin,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Admin not found',
      });
    }
  }

  async generateId(req: Request, res: Response): Promise<void> {
    try {
      const id = await adminService.generateUniqueAdminId();
      res.status(200).json({
        success: true,
        data: { id },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate ID',
      });
    }
  }

  async createAdmin(req: Request, res: Response): Promise<void> {
    try {
      const newAdmin = await adminService.createAdmin(req.body);
      res.status(201).json({
        success: true,
        message: 'Admin account created successfully',
        data: newAdmin,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create admin',
      });
    }
  }

  async updateAdmin(req: Request, res: Response): Promise<void> {
    try {
      const updated = await adminService.updateAdmin(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Admin updated successfully',
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update admin',
      });
    }
  }

  async deleteAdmin(req: Request, res: Response): Promise<void> {
    try {
      await adminService.deleteAdmin(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Admin account deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete admin',
      });
    }
  }
}

export const adminController = new AdminController();
