import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';

const router = Router();

router.get('/', (req, res) => cartController.getCart(req, res));
router.post('/', (req, res) => cartController.addToCart(req, res));
router.post('/sync', (req, res) => cartController.syncGuestCart(req, res));
router.patch('/:id', (req, res) => cartController.updateQuantity(req, res));
router.delete('/:id', (req, res) => cartController.removeFromCart(req, res));
router.delete('/', (req, res) => cartController.clearCart(req, res));

export default router;
