export interface CartItemRow {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  selected_size: string | null;
  selected_color: string | null;
  created_at: Date;
  updated_at: Date;
  
  // Product details from join
  title: string;
  slug: string;
  sku?: string | null;
  regular_price: number | string;
  sale_price: number | string | null;
  stock_quantity: number;
  stock_status: string;
  has_image: boolean;
  image_url?: string;
}

export interface AddToCartDto {
  user_id: string;
  product_id: string;
  quantity: number;
  selected_size?: string;
  selected_color?: string;
}

export interface UpdateCartItemDto {
  quantity: number;
}

export interface SyncCartItemDto {
  product_id: string;
  quantity: number;
  selected_size?: string;
  selected_color?: string;
}
