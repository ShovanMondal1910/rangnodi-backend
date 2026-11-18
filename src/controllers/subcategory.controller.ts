import { Request, Response } from 'express';
import { subcategoryService } from '../services/subcategory.service';

export const getSubcategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const category_id = typeof req.query.category_id === 'string' ? req.query.category_id : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const subcategories = await subcategoryService.getAllSubcategories({
      category_id,
      status,
      search,
    });
    res.status(200).json({ success: true, data: subcategories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubcategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const subcategory = await subcategoryService.getSubcategoryById(id);
    if (!subcategory) {
      res.status(404).json({ success: false, message: 'Subcategory not found' });
      return;
    }
    res.status(200).json({ success: true, data: subcategory });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateSubcategoryId = async (_req: Request, res: Response): Promise<void> => {
  try {
    const subcategory_id = await subcategoryService.generateUniqueId();
    res.status(200).json({ success: true, subcategory_id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category_id } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Subcategory name is required' });
      return;
    }
    if (!category_id) {
      res.status(400).json({ success: false, message: 'Parent category_id is required' });
      return;
    }
    const subcategory = await subcategoryService.createSubcategory(req.body);
    res.status(201).json({ success: true, data: subcategory });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'A subcategory with this ID or slug within this category already exists',
      });
      return;
    }
    if (error.code === '23503') {
      res.status(400).json({
        success: false,
        message: 'Invalid parent category_id: category does not exist',
      });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const subcategory = await subcategoryService.updateSubcategory(id, req.body);
    if (!subcategory) {
      res.status(404).json({ success: false, message: 'Subcategory not found' });
      return;
    }
    res.status(200).json({ success: true, data: subcategory });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'A subcategory with this slug within this category already exists',
      });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await subcategoryService.deleteSubcategory(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Subcategory not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
