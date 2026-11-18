import { Router } from 'express';
import { productController } from '../controllers/product.controller';

const router = Router();

router.get('/generate-id', (req, res, next) => productController.generateId(req, res, next));
router.get('/generate-sku', (req, res, next) => productController.generateSku(req, res, next));
router.get('/:id/main-image', (req, res, next) => productController.serveMainImage(req, res, next));
router.get('/images/:imageId', (req, res, next) => productController.serveGalleryImage(req, res, next));
router.get('/:id', (req, res, next) => productController.getById(req, res, next));
router.get('/', (req, res, next) => productController.getAll(req, res, next));
router.post('/', (req, res, next) => productController.create(req, res, next));
router.put('/:id', (req, res, next) => productController.update(req, res, next));
router.delete('/:id', (req, res, next) => productController.delete(req, res, next));
router.delete('/images/:imageId', (req, res, next) => productController.deleteGalleryImage(req, res, next));

export default router;
