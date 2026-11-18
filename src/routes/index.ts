import { Router } from 'express';
import healthRouter from './health.route';
import apiRouter from './api.route';
import categoryRouter from './category.route';
import subcategoryRouter from './subcategory.route';
import catalogRouter from './catalog.route';
import productRouter from './product.route';
import authRouter from './auth.route';
import adminRouter from './admin.route';
import customerRouter from './customer.route';

const router = Router();

router.use('/health', healthRouter);
router.use('/api/v1', apiRouter);

// Authentication, Admin & Customer Management Endpoints
router.use('/api/v1/auth', authRouter);
router.use('/api/v1/admins', adminRouter);
router.use('/api/v1/customers', customerRouter);

// Catalog Hierarchy & Resource Endpoints
router.use('/api/v1/categories', categoryRouter);
router.use('/api/v1/subcategories', subcategoryRouter);
router.use('/api/v1/catalog', catalogRouter);
router.use('/api/v1/products', productRouter);

export default router;
