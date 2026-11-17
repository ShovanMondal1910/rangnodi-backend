import { Router } from 'express';
import healthRouter from './health.route';
import apiRouter from './api.route';

const router = Router();

router.use('/health', healthRouter);
router.use('/api/v1', apiRouter);

export default router;
