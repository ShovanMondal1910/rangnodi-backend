import { Category } from './category.types';

export type SubcategoryStatus = 'active' | 'inactive';

export interface Subcategory {
  subcategory_id: string;
  category_id: string;
  group_name: string;
  name: string;
  slug: string;
  sort_order: number;
  status: SubcategoryStatus;
  created_at: string;
  updated_at: string;
  category_name?: string;
  products_count?: number;
}

export interface CreateSubcategoryDTO {
  subcategory_id?: string;
  category_id: string;
  group_name?: string;
  name: string;
  slug?: string;
  sort_order?: number;
  status?: SubcategoryStatus;
}

export interface UpdateSubcategoryDTO {
  category_id?: string;
  group_name?: string;
  name?: string;
  slug?: string;
  sort_order?: number;
  status?: SubcategoryStatus;
}

export interface CategoryHierarchyItem extends Category {
  subcategories: Subcategory[];
}

export interface CatalogSummary {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  totalSubcategories: number;
  activeSubcategories: number;
  inactiveSubcategories: number;
  campaignBadgesCount: number;
  linkedProductsCount: number;
}
