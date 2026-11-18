import { query, pool } from '../config/database';
import { generate10DigitId } from '../utils/idGenerator';
import { slugify } from '../utils/slugify';
import {
  CreateProductDTO,
  UpdateProductDTO,
  ProductSummary,
  ProductFilters,
} from '../types/product.types';

// Helper to strip data URL prefix if present and convert to Buffer
function parseBase64Image(dataString: string): { buffer: Buffer; mime: string } {
  const match = dataString.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return {
      mime: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    };
  }
  return {
    mime: 'image/jpeg',
    buffer: Buffer.from(dataString, 'base64'),
  };
}

export class ProductService {
  /**
   * Generates a 10-digit unique product ID
   */
  async generateProductId(): Promise<string> {
    let id = generate10DigitId();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const res = await query('SELECT 1 FROM products WHERE product_id = $1', [id]);
      if (res.rowCount === 0) {
        isUnique = true;
      } else {
        id = generate10DigitId();
        attempts++;
      }
    }
    return id;
  }

  /**
   * Generates a standard SKU e.g. RNG-MEN-101
   */
  async generateSKU(categoryHint?: string): Promise<string> {
    const prefix = 'RNG';
    const tag = (categoryHint || 'PROD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    const randomNum = Math.floor(100 + Math.random() * 900);
    const candidate = `${prefix}-${tag}-${randomNum}`;
    
    const res = await query('SELECT 1 FROM products WHERE sku = $1', [candidate]);
    if (res.rowCount === 0) {
      return candidate;
    }
    const extra = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${tag}-${extra}`;
  }

  /**
   * Create a new product with optional binary showcase image and gallery images
   */
  async createProduct(dto: CreateProductDTO): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const productId = dto.product_id?.trim() || (await this.generateProductId());
      const slug = dto.slug?.trim() || slugify(dto.title);
      const sku = dto.sku?.trim() || (await this.generateSKU());
      const brand = dto.brand?.trim() || 'Rangnodi';
      const regularPrice = Number(dto.regular_price);
      const salePrice = dto.sale_price !== undefined && dto.sale_price !== null && dto.sale_price !== ('' as any)
        ? Number(dto.sale_price)
        : null;
      const stockQuantity = dto.stock_quantity !== undefined ? Number(dto.stock_quantity) : 10;
      const lowStockThreshold = dto.low_stock_threshold !== undefined ? Number(dto.low_stock_threshold) : 5;
      const stockStatus = dto.stock_status || 'in_stock';
      const maxPurchaseLimit = dto.max_purchase_limit !== undefined ? Number(dto.max_purchase_limit) : 5;
      const weightKg = dto.weight_kg !== undefined ? Number(dto.weight_kg) : 0.5;
      const freeShipping = Boolean(dto.free_shipping);
      const isCodAvailable = dto.is_cod_available !== undefined ? Boolean(dto.is_cod_available) : true;
      const warrantyPeriod = dto.warranty_period?.trim() || '7-Day Easy Replacement';
      const shortDescription = dto.short_description?.trim() || null;
      const description = dto.description?.trim() || null;
      const sizes = Array.isArray(dto.sizes) ? dto.sizes : [];
      const colors = Array.isArray(dto.colors) ? dto.colors : [];
      const tags = Array.isArray(dto.tags) ? dto.tags : [];
      const badge = dto.badge?.trim() ? dto.badge.trim() : null;
      const isFeatured = Boolean(dto.is_featured);
      const flashDealEnd = dto.flash_deal_end ? new Date(dto.flash_deal_end) : null;
      const status = dto.status || 'active';

      // Binary Main Image Parsing
      let mainImageBlob: Buffer | null = null;
      let mainImageMime = dto.main_image_mime || 'image/jpeg';

      if (dto.main_image_base64 && dto.main_image_base64.trim()) {
        const parsed = parseBase64Image(dto.main_image_base64);
        mainImageBlob = parsed.buffer;
        mainImageMime = parsed.mime || mainImageMime;
      }

      const insertProductSql = `
        INSERT INTO products (
          product_id, title, slug, sku,
          category_id, subcategory_id, brand,
          regular_price, sale_price,
          stock_quantity, low_stock_threshold, stock_status, max_purchase_limit,
          weight_kg, free_shipping, is_cod_available, warranty_period,
          main_image_blob, main_image_mime,
          short_description, description,
          sizes, colors, tags,
          badge, is_featured, flash_deal_end, status
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19,
          $20, $21,
          $22, $23, $24,
          $25, $26, $27, $28
        )
        RETURNING product_id, title, slug, sku, category_id, subcategory_id, regular_price, sale_price, status, created_at;
      `;

      const prodRes = await client.query(insertProductSql, [
        productId,
        dto.title.trim(),
        slug,
        sku,
        dto.category_id,
        dto.subcategory_id || null,
        brand,
        regularPrice,
        salePrice,
        stockQuantity,
        lowStockThreshold,
        stockStatus,
        maxPurchaseLimit,
        weightKg,
        freeShipping,
        isCodAvailable,
        warrantyPeriod,
        mainImageBlob,
        mainImageMime,
        shortDescription,
        description,
        sizes,
        colors,
        tags,
        badge,
        isFeatured,
        flashDealEnd,
        status,
      ]);

      const createdProduct = prodRes.rows[0];

      // Insert Gallery Images if provided
      if (Array.isArray(dto.gallery_images) && dto.gallery_images.length > 0) {
        for (let i = 0; i < dto.gallery_images.length; i++) {
          const item = dto.gallery_images[i];
          if (item.image_blob_base64 && item.image_blob_base64.trim()) {
            const parsed = parseBase64Image(item.image_blob_base64);
            const imageId = generate10DigitId();
            await client.query(
              `INSERT INTO product_images (image_id, product_id, image_blob, image_mime, sort_order)
               VALUES ($1, $2, $3, $4, $5)`,
              [imageId, productId, parsed.buffer, parsed.mime, item.sort_order ?? i]
            );
          }
        }
      }

      await client.query('COMMIT');
      return createdProduct;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get main showcase image binary
   */
  async getMainImage(productId: string): Promise<{ blob: Buffer; mime: string } | null> {
    const res = await query(
      'SELECT main_image_blob, main_image_mime FROM products WHERE product_id = $1 AND deleted_at IS NULL',
      [productId]
    );
    if (!res.rows[0] || !res.rows[0].main_image_blob) return null;
    return {
      blob: res.rows[0].main_image_blob,
      mime: res.rows[0].main_image_mime || 'image/jpeg',
    };
  }

  /**
   * Get gallery image binary by image_id
   */
  async getGalleryImage(imageId: string): Promise<{ blob: Buffer; mime: string } | null> {
    const res = await query(
      'SELECT image_blob, image_mime FROM product_images WHERE image_id = $1',
      [imageId]
    );
    if (!res.rows[0] || !res.rows[0].image_blob) return null;
    return {
      blob: res.rows[0].image_blob,
      mime: res.rows[0].image_mime || 'image/jpeg',
    };
  }

  /**
   * List products with lightweight metadata (excluding huge binary blobs)
   */
  async getProducts(filters?: ProductFilters): Promise<ProductSummary[]> {
    let sql = `
      SELECT 
        p.product_id,
        p.title,
        p.slug,
        p.sku,
        p.category_id,
        c.name AS category_name,
        p.subcategory_id,
        s.name AS subcategory_name,
        p.brand,
        p.regular_price,
        p.sale_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.stock_status,
        p.status,
        p.badge,
        p.is_featured,
        p.free_shipping,
        p.is_cod_available,
        p.main_image_mime,
        (p.main_image_blob IS NOT NULL) AS has_main_image,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN subcategories s ON s.subcategory_id = p.subcategory_id
      WHERE p.deleted_at IS NULL
    `;

    const params: any[] = [];

    if (filters?.category_id) {
      params.push(filters.category_id);
      sql += ` AND p.category_id = $${params.length}`;
    }

    if (filters?.subcategory_id) {
      params.push(filters.subcategory_id);
      sql += ` AND p.subcategory_id = $${params.length}`;
    }

    if (filters?.status && filters.status !== 'all') {
      params.push(filters.status);
      sql += ` AND p.status = $${params.length}`;
    }

    if (filters?.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      sql += ` AND (p.title ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.product_id ILIKE $${params.length})`;
    }

    sql += ` ORDER BY p.created_at DESC`;

    const res = await query<ProductSummary>(sql, params);
    return res.rows;
  }

  /**
   * Get single product with detailed attributes and gallery image IDs
   */
  async getProductById(id: string): Promise<any | null> {
    const prodRes = await query(
      `SELECT 
        p.product_id, p.title, p.slug, p.sku,
        p.category_id, c.name AS category_name,
        p.subcategory_id, s.name AS subcategory_name, s.group_name AS subcategory_group,
        p.brand, p.regular_price, p.sale_price,
        p.stock_quantity, p.low_stock_threshold, p.stock_status, p.max_purchase_limit,
        p.weight_kg, p.free_shipping, p.is_cod_available, p.warranty_period,
        p.short_description, p.description,
        p.sizes, p.colors, p.tags,
        p.rating_avg, p.rating_count, p.sales_count, p.views_count,
        p.badge, p.is_featured, p.flash_deal_end, p.status,
        (p.main_image_blob IS NOT NULL) AS has_main_image,
        p.main_image_mime,
        p.created_at, p.updated_at
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN subcategories s ON s.subcategory_id = p.subcategory_id
       WHERE p.product_id = $1 AND p.deleted_at IS NULL`,
      [id]
    );

    if (prodRes.rowCount === 0) return null;
    const product = prodRes.rows[0];

    // Fetch gallery image ids
    const galleryRes = await query(
      `SELECT image_id, sort_order, image_mime, created_at
       FROM product_images
       WHERE product_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [id]
    );

    product.gallery_images = galleryRes.rows.map((img) => ({
      image_id: img.image_id,
      image_url: `/api/v1/products/images/${img.image_id}`,
      sort_order: img.sort_order,
      image_mime: img.image_mime,
    }));

    if (product.has_main_image) {
      product.main_image_url = `/api/v1/products/${id}/main-image`;
    }

    return product;
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, dto: UpdateProductDTO): Promise<any | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingRes = await client.query(
        'SELECT * FROM products WHERE product_id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (existingRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const existing = existingRes.rows[0];

      const newId = dto.product_id?.trim() || id;
      const title = dto.title !== undefined ? dto.title.trim() : existing.title;
      const slug = dto.slug !== undefined ? dto.slug.trim() : existing.slug;
      const sku = dto.sku !== undefined ? dto.sku.trim() : existing.sku;
      const categoryId = dto.category_id !== undefined ? dto.category_id : existing.category_id;
      const subcategoryId = dto.subcategory_id !== undefined ? dto.subcategory_id : existing.subcategory_id;
      const brand = dto.brand !== undefined ? dto.brand.trim() : existing.brand;
      const regularPrice = dto.regular_price !== undefined ? Number(dto.regular_price) : Number(existing.regular_price);
      const salePrice = dto.sale_price !== undefined 
        ? (dto.sale_price !== null && dto.sale_price !== ('' as any) ? Number(dto.sale_price) : null)
        : existing.sale_price;
      const stockQuantity = dto.stock_quantity !== undefined ? Number(dto.stock_quantity) : existing.stock_quantity;
      const lowStockThreshold = dto.low_stock_threshold !== undefined ? Number(dto.low_stock_threshold) : existing.low_stock_threshold;
      const stockStatus = dto.stock_status !== undefined ? dto.stock_status : existing.stock_status;
      const maxPurchaseLimit = dto.max_purchase_limit !== undefined ? Number(dto.max_purchase_limit) : existing.max_purchase_limit;
      const weightKg = dto.weight_kg !== undefined ? Number(dto.weight_kg) : existing.weight_kg;
      const freeShipping = dto.free_shipping !== undefined ? Boolean(dto.free_shipping) : existing.free_shipping;
      const isCodAvailable = dto.is_cod_available !== undefined ? Boolean(dto.is_cod_available) : existing.is_cod_available;
      const warrantyPeriod = dto.warranty_period !== undefined ? dto.warranty_period.trim() : existing.warranty_period;
      const shortDescription = dto.short_description !== undefined ? dto.short_description.trim() : existing.short_description;
      const description = dto.description !== undefined ? dto.description.trim() : existing.description;
      const sizes = dto.sizes !== undefined ? (Array.isArray(dto.sizes) ? dto.sizes : []) : existing.sizes;
      const colors = dto.colors !== undefined ? (Array.isArray(dto.colors) ? dto.colors : []) : existing.colors;
      const tags = dto.tags !== undefined ? (Array.isArray(dto.tags) ? dto.tags : []) : existing.tags;
      const badge = dto.badge !== undefined ? (dto.badge?.trim() ? dto.badge.trim() : null) : existing.badge;
      const isFeatured = dto.is_featured !== undefined ? Boolean(dto.is_featured) : existing.is_featured;
      const flashDealEnd = dto.flash_deal_end !== undefined ? (dto.flash_deal_end ? new Date(dto.flash_deal_end) : null) : existing.flash_deal_end;
      const status = dto.status !== undefined ? dto.status : existing.status;

      // Handle image updates
      let mainImageBlob = existing.main_image_blob;
      let mainImageMime = existing.main_image_mime;

      if (dto.main_image_base64 !== undefined) {
        if (!dto.main_image_base64 || !dto.main_image_base64.trim()) {
          mainImageBlob = null;
          mainImageMime = 'image/jpeg';
        } else {
          const parsed = parseBase64Image(dto.main_image_base64);
          mainImageBlob = parsed.buffer;
          mainImageMime = parsed.mime || dto.main_image_mime || 'image/jpeg';
        }
      }

      // If product_id changed, update it first with cascade or manual update
      if (newId !== id) {
        await client.query('UPDATE product_images SET product_id = $1 WHERE product_id = $2', [newId, id]);
        await client.query('UPDATE products SET product_id = $1 WHERE product_id = $2', [newId, id]);
      }

      const updateSql = `
        UPDATE products
        SET
          title = $1,
          slug = $2,
          sku = $3,
          category_id = $4,
          subcategory_id = $5,
          brand = $6,
          regular_price = $7,
          sale_price = $8,
          stock_quantity = $9,
          low_stock_threshold = $10,
          stock_status = $11,
          max_purchase_limit = $12,
          weight_kg = $13,
          free_shipping = $14,
          is_cod_available = $15,
          warranty_period = $16,
          main_image_blob = $17,
          main_image_mime = $18,
          short_description = $19,
          description = $20,
          sizes = $21,
          colors = $22,
          tags = $23,
          badge = $24,
          is_featured = $25,
          flash_deal_end = $26,
          status = $27
        WHERE product_id = $28
        RETURNING *;
      `;

      const prodRes = await client.query(updateSql, [
        title,
        slug,
        sku,
        categoryId,
        subcategoryId || null,
        brand,
        regularPrice,
        salePrice,
        stockQuantity,
        lowStockThreshold,
        stockStatus,
        maxPurchaseLimit,
        weightKg,
        freeShipping,
        isCodAvailable,
        warrantyPeriod,
        mainImageBlob,
        mainImageMime,
        shortDescription,
        description,
        sizes,
        colors,
        tags,
        badge,
        isFeatured,
        flashDealEnd,
        status,
        newId,
      ]);

      // Insert any new gallery photos
      if (Array.isArray(dto.gallery_images) && dto.gallery_images.length > 0) {
        for (let i = 0; i < dto.gallery_images.length; i++) {
          const item = dto.gallery_images[i];
          if (item.image_blob_base64 && item.image_blob_base64.trim()) {
            const parsed = parseBase64Image(item.image_blob_base64);
            const imageId = generate10DigitId();
            await client.query(
              `INSERT INTO product_images (image_id, product_id, image_blob, image_mime, sort_order)
               VALUES ($1, $2, $3, $4, $5)`,
              [imageId, newId, parsed.buffer, parsed.mime, item.sort_order ?? i]
            );
          }
        }
      }

      await client.query('COMMIT');
      return prodRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete gallery photo
   */
  async deleteGalleryImage(imageId: string): Promise<boolean> {
    const res = await query('DELETE FROM product_images WHERE image_id = $1', [imageId]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id: string): Promise<boolean> {
    const res = await query(
      'UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE product_id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const productService = new ProductService();
