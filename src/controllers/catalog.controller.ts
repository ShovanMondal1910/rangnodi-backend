import { Request, Response } from 'express';
import { catalogService } from '../services/catalog.service';

export const getCatalogSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const summary = await catalogService.getSummary();
    res.status(200).json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCatalogHierarchy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const hierarchy = await catalogService.getHierarchy({
      status: status as string,
      search: search as string,
    });
    res.status(200).json({ success: true, data: hierarchy });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
