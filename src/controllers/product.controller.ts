import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';

export class ProductController {
  async generateId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = await productService.generateProductId();
      res.json({ success: true, data: { product_id: id } });
    } catch (error) {
      next(error);
    }
  }

  async generateSku(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = (req.query['category'] as string) || '';
      const sku = await productService.generateSKU(category);
      res.json({ success: true, data: { sku } });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, category_id, regular_price } = req.body;
      if (!title || !title.trim()) {
        res.status(400).json({ success: false, message: 'Product title is required' });
        return;
      }
      if (!category_id) {
        res.status(400).json({ success: false, message: 'Category is required' });
        return;
      }
      if (regular_price === undefined || regular_price === null || regular_price === '') {
        res.status(400).json({ success: false, message: 'Regular price is required' });
        return;
      }

      const product = await productService.createProduct(req.body);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        category_id: req.query['category_id'] as string,
        subcategory_id: req.query['subcategory_id'] as string,
        status: req.query['status'] as string,
        search: req.query['search'] as string,
      };
      const products = await productService.getProducts(filters);
      res.json({ success: true, count: products.length, data: products });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async serveMainImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const img = await productService.getMainImage(id);
      if (!img) {
        res.status(404).send('Image not found');
        return;
      }
      res.setHeader('Content-Type', img.mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(img.blob);
    } catch (error) {
      next(error);
    }
  }

  async serveGalleryImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageId } = req.params;
      const img = await productService.getGalleryImage(imageId);
      if (!img) {
        res.status(404).send('Image not found');
        return;
      }
      res.setHeader('Content-Type', img.mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(img.blob);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await productService.updateProduct(id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }
      res.json({
        success: true,
        message: 'Product updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const success = await productService.deleteProduct(id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async deleteGalleryImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageId } = req.params;
      const success = await productService.deleteGalleryImage(imageId);
      res.json({ success, message: success ? 'Gallery image deleted' : 'Image not found' });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
