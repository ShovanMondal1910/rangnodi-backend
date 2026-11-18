import { query } from '../config/database';
import { Subcategory, CreateSubcategoryDTO, UpdateSubcategoryDTO } from '../types/subcategory.types';
import { generate10DigitId } from '../utils/idGenerator';

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export class SubcategoryService {
  async generateUniqueId(): Promise<string> {
    let id = generate10DigitId();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const res = await query('SELECT 1 FROM subcategories WHERE subcategory_id = $1', [id]);
      if (res.rowCount === 0) {
        isUnique = true;
      } else {
        id = generate10DigitId();
        attempts++;
      }
    }

    return id;
  }

  async getAllSubcategories(filters?: {
    category_id?: string;
    status?: string;
    search?: string;
  }): Promise<Subcategory[]> {
    let sql = `
      SELECT 
        s.*,
        c.name AS category_name,
        0 AS products_count
      FROM subcategories s
      JOIN categories c ON c.category_id = s.category_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.category_id) {
      params.push(filters.category_id);
      sql += ` AND s.category_id = $${params.length}`;
    }

    if (filters?.status && filters.status !== 'all') {
      params.push(filters.status);
      sql += ` AND s.status = $${params.length}`;
    }

    if (filters?.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      sql += ` AND (s.name ILIKE $${params.length} OR s.slug ILIKE $${params.length} OR s.group_name ILIKE $${params.length} OR s.subcategory_id ILIKE $${params.length})`;
    }

    sql += ` ORDER BY s.category_id ASC, s.group_name ASC, s.sort_order ASC, s.created_at ASC`;

    const res = await query<Subcategory>(sql, params);
    return res.rows;
  }

  async getSubcategoryById(id: string): Promise<Subcategory | null> {
    const res = await query<Subcategory>(
      `SELECT s.*, c.name AS category_name, 0 AS products_count
       FROM subcategories s
       JOIN categories c ON c.category_id = s.category_id
       WHERE s.subcategory_id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async createSubcategory(dto: CreateSubcategoryDTO): Promise<Subcategory> {
    const subcategoryId = dto.subcategory_id?.trim() || (await this.generateUniqueId());
    const slug = dto.slug?.trim() || slugify(dto.name);
    const groupName = dto.group_name?.trim() || 'Main Collection';
    const sortOrder = dto.sort_order !== undefined ? Number(dto.sort_order) : 0;
    const status = dto.status || 'active';

    const insertSql = `
      INSERT INTO subcategories (
        subcategory_id, category_id, group_name, name, slug, sort_order, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const res = await query<Subcategory>(insertSql, [
      subcategoryId,
      dto.category_id,
      groupName,
      dto.name.trim(),
      slug,
      sortOrder,
      status,
    ]);

    return res.rows[0];
  }

  async updateSubcategory(id: string, dto: UpdateSubcategoryDTO): Promise<Subcategory | null> {
    const existing = await this.getSubcategoryById(id);
    if (!existing) return null;

    const categoryId = dto.category_id !== undefined ? dto.category_id : existing.category_id;
    const groupName = dto.group_name !== undefined ? dto.group_name.trim() : existing.group_name;
    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    const slug = dto.slug !== undefined ? dto.slug.trim() : existing.slug;
    const sortOrder = dto.sort_order !== undefined ? Number(dto.sort_order) : existing.sort_order;
    const status = dto.status !== undefined ? dto.status : existing.status;

    const updateSql = `
      UPDATE subcategories
      SET 
        category_id = $1,
        group_name = $2,
        name = $3,
        slug = $4,
        sort_order = $5,
        status = $6
      WHERE subcategory_id = $7
      RETURNING *;
    `;

    const res = await query<Subcategory>(updateSql, [
      categoryId,
      groupName,
      name,
      slug,
      sortOrder,
      status,
      id,
    ]);

    return res.rows[0] || null;
  }

  async deleteSubcategory(id: string): Promise<boolean> {
    const res = await query('DELETE FROM subcategories WHERE subcategory_id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const subcategoryService = new SubcategoryService();
