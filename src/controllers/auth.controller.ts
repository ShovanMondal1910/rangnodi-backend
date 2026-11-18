import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.signup(req.body);
      res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        data: { user },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create account',
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.login(req.body);
      res.status(200).json({
        success: true,
        message: 'Logged in successfully!',
        data: { user },
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed',
      });
    }
  }

  async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.googleAuth(req.body);
      res.status(200).json({
        success: true,
        message: 'Google authentication successful!',
        data: { user },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Google authentication failed',
      });
    }
  }
}

export const authController = new AuthController();
