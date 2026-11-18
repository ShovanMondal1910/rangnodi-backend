import { Router } from 'express';
import { orderController } from '../controllers/order.controller';

const router = Router();

router.post('/', (req, res) => orderController.createOrder(req, res));
router.get('/', (req, res) => orderController.getAllOrders(req, res));
router.get('/my-orders', (req, res) => orderController.getUserOrders(req, res));
router.get('/:id', (req, res) => orderController.getOrderById(req, res));
router.patch('/:id/status', (req, res) => orderController.updateOrderStatus(req, res));
router.delete('/:id', (req, res) => orderController.deleteOrder(req, res));

export default router;
