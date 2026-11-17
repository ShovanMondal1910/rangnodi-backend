import { Request, Response } from 'express';

export const getHealth = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    message: 'Rangnodi Backend API is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
