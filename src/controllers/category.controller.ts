import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const categories = await categoryService.getAllCategories({ status, search });
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const category = await categoryService.getCategoryById(id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateCategoryId = async (_req: Request, res: Response): Promise<void> => {
  try {
    const category_id = await categoryService.generateUniqueId();
    res.status(200).json({ success: true, category_id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Category name is required' });
      return;
    }
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'A category with this ID, name, or slug already exists',
      });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const category = await categoryService.updateCategory(id, req.body);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'A category with this name or slug already exists',
      });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await categoryService.deleteCategory(id);
    if (!result.success) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: `Category and ${result.deletedSubcategoriesCount} subcategory(s) deleted successfully`,
      deletedSubcategoriesCount: result.deletedSubcategoriesCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
