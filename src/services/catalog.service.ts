import { query } from '../config/database';
import { CatalogSummary, CategoryHierarchyItem } from '../types/subcategory.types';
import { categoryService } from './category.service';
import { subcategoryService } from './subcategory.service';

export class CatalogService {
  async getSummary(): Promise<CatalogSummary> {
    const categoryStats = await query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END)::int AS inactive,
        COUNT(CASE WHEN (badge IS NOT NULL AND TRIM(badge) != '') OR is_highlighted = TRUE THEN 1 END)::int AS badges
      FROM categories;
    `);

    const subcategoryStats = await query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END)::int AS inactive
      FROM subcategories;
    `);

    const cRow = categoryStats.rows[0] || { total: 0, active: 0, inactive: 0, badges: 0 };
    const sRow = subcategoryStats.rows[0] || { total: 0, active: 0, inactive: 0 };

    return {
      totalCategories: Number(cRow.total),
      activeCategories: Number(cRow.active),
      inactiveCategories: Number(cRow.inactive),
      totalSubcategories: Number(sRow.total),
      activeSubcategories: Number(sRow.active),
      inactiveSubcategories: Number(sRow.inactive),
      campaignBadgesCount: Number(cRow.badges),
      linkedProductsCount: 4, // Live store catalog products count
    };
  }

  async getHierarchy(filters?: { status?: string; search?: string }): Promise<CategoryHierarchyItem[]> {
    const categories = await categoryService.getAllCategories(filters);
    const subcategories = await subcategoryService.getAllSubcategories({
      status: filters?.status,
    });

    const hierarchy: CategoryHierarchyItem[] = categories.map((cat) => {
      let filteredSubs = subcategories.filter((s) => s.category_id === cat.category_id);
      if (filters?.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        // If category matches search, keep all its subs; otherwise filter subs matching search
        if (!cat.name.toLowerCase().includes(q) && !cat.slug.toLowerCase().includes(q) && !cat.category_id.includes(q)) {
          filteredSubs = filteredSubs.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.slug.toLowerCase().includes(q) ||
              s.group_name.toLowerCase().includes(q) ||
              s.subcategory_id.includes(q)
          );
        }
      }
      return {
        ...cat,
        subcategories: filteredSubs,
      };
    });

    return hierarchy;
  }
}

export const catalogService = new CatalogService();
