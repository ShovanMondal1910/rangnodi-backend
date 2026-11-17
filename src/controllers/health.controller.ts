import { Request, Response } from 'express';
import { query } from '../config/database';

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbRes = await query('SELECT 1 + 1 AS result');
    const isDbConnected = dbRes.rows[0]?.result === 2;

    res.status(200).json({
      status: 'ok',
      message: 'Rangnodi Backend API is running smoothly',
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
};
