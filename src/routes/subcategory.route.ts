import { Router } from 'express';
import {
  getSubcategories,
  getSubcategoryById,
  generateSubcategoryId,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '../controllers/subcategory.controller';

const router = Router();

router.get('/generate-id', generateSubcategoryId);
router.get('/', getSubcategories);
router.get('/:id', getSubcategoryById);
router.post('/', createSubcategory);
router.put('/:id', updateSubcategory);
router.delete('/:id', deleteSubcategory);

export default router;
