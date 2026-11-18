import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';

const router = Router();

router.get('/generate-id', (req, res) => customerController.generateId(req, res));
router.get('/:id/avatar', (req, res) => customerController.getAvatar(req, res));
router.get('/', (req, res) => customerController.getAllCustomers(req, res));
router.get('/:id', (req, res) => customerController.getCustomerById(req, res));
router.post('/', (req, res) => customerController.createCustomer(req, res));
router.put('/:id', (req, res) => customerController.updateCustomer(req, res));
router.delete('/:id', (req, res) => customerController.deleteCustomer(req, res));

export default router;
