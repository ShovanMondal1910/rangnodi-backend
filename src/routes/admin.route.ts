import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';

const router = Router();

router.get('/generate-id', (req, res) => adminController.generateId(req, res));
router.get('/dashboard-stats', (req, res) => adminController.getDashboardStats(req, res));
router.get('/:id/avatar', (req, res) => adminController.getAvatar(req, res));
router.get('/', (req, res) => adminController.getAllAdmins(req, res));
router.get('/:id', (req, res) => adminController.getAdminById(req, res));
router.post('/', (req, res) => adminController.createAdmin(req, res));
router.put('/:id', (req, res) => adminController.updateAdmin(req, res));
router.delete('/:id', (req, res) => adminController.deleteAdmin(req, res));

export default router;
