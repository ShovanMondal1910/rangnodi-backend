export type StockStatus = 'in_stock' | 'out_of_stock' | 'pre_order';
export type ProductStatus = 'active' | 'inactive' | 'draft';

export interface ProductImageInput {
  image_blob_base64: string; // Base64 data (with or without data:image/...;base64, prefix)
  image_mime?: string;
  sort_order?: number;
}

export interface CreateProductDTO {
  product_id?: string;
  title: string;
  slug?: string;
  sku?: string;
  category_id: string;
  subcategory_id?: string | null;
  brand?: string;
  regular_price: number;
  sale_price?: number | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  stock_status?: StockStatus;
  max_purchase_limit?: number;
  weight_kg?: number;
  free_shipping?: boolean;
  is_cod_available?: boolean;
  warranty_period?: string;
  short_description?: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  tags?: string[];
  badge?: string | null;
  is_featured?: boolean;
  flash_deal_end?: string | null;
  status?: ProductStatus;
  
  // Binary image payload (Base64)
  main_image_base64?: string | null;
  main_image_mime?: string;

  // Additional gallery images
  gallery_images?: ProductImageInput[];
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

export interface ProductSummary {
  product_id: string;
  title: string;
  slug: string;
  sku: string | null;
  category_id: string;
  category_name?: string;
  subcategory_id: string | null;
  subcategory_name?: string;
  brand: string;
  regular_price: number;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_status: StockStatus;
  status: ProductStatus;
  badge: string | null;
  is_featured: boolean;
  free_shipping: boolean;
  is_cod_available: boolean;
  main_image_mime?: string;
  has_main_image: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  category_id?: string;
  subcategory_id?: string;
  status?: string;
  stock_status?: string;
  search?: string;
  is_featured?: boolean;
}
