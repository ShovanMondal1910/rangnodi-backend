import { Router } from 'express';
import { getCatalogSummary, getCatalogHierarchy } from '../controllers/catalog.controller';

const router = Router();

router.get('/summary', getCatalogSummary);
router.get('/hierarchy', getCatalogHierarchy);

export default router;
