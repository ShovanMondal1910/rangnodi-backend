export type CategoryStatus = 'active' | 'inactive';

export interface Category {
  category_id: string;
  name: string;
  slug: string;
  badge: string | null;
  is_highlighted: boolean;
  sort_order: number;
  status: CategoryStatus;
  created_at: string;
  updated_at: string;
  products_count?: number;
  subcategories_count?: number;
}

export interface CreateCategoryDTO {
  category_id?: string;
  name: string;
  slug?: string;
  badge?: string | null;
  is_highlighted?: boolean;
  sort_order?: number;
  status?: CategoryStatus;
}

export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  badge?: string | null;
  is_highlighted?: boolean;
  sort_order?: number;
  status?: CategoryStatus;
}
