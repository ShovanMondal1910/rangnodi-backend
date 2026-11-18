import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { generate10DigitId } from '../utils/idGenerator';
import { UserRow, SanitizedUser, UserStatus } from '../types/auth.types';

export interface CreateAdminDto {
  fullname: string;
  email: string;
  password: string;
  phone?: string | null;
  status?: UserStatus;
  avatar?: string | null;
}

export interface UpdateAdminDto {
  fullname?: string;
  email?: string;
  password?: string | null;
  phone?: string | null;
  status?: UserStatus;
  avatar?: string | null;
}

export class AdminService {
  /**
   * Fetch aggregate KPI counts for Admin Dashboard
   */
  async getDashboardStats() {
    const [productsRes, categoriesRes, subcategoriesRes, usersRes, alertsRes, imagesRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM products"),
      pool.query("SELECT COUNT(*) FROM categories"),
      pool.query("SELECT COUNT(*) FROM subcategories"),
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold OR stock_quantity <= 0"),
      pool.query("SELECT COUNT(*) FROM product_images")
    ]);

    return {
      totalProducts: parseInt(productsRes.rows[0]?.count || '0', 10),
      totalCategories: parseInt(categoriesRes.rows[0]?.count || '0', 10),
      totalSubcategories: parseInt(subcategoriesRes.rows[0]?.count || '0', 10),
      totalUsers: parseInt(usersRes.rows[0]?.count || '0', 10),
      stockAlerts: parseInt(alertsRes.rows[0]?.count || '0', 10),
      mediaAssets: parseInt(imagesRes.rows[0]?.count || '0', 10),
    };
  }

  private sanitizeAdmin(user: UserRow): SanitizedUser {
    return {
      user_id: user.user_id,
      fullname: user.fullname,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
      status: user.status,
      oauth_provider: user.oauth_provider,
      email_verified_at: user.email_verified_at,
      created_at: user.created_at,
    };
  }

  /**
   * Generates a guaranteed-unique 10-digit ID for a new Admin
   */
  async generateUniqueAdminId(): Promise<string> {
    let id = generate10DigitId();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const res = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [id]);
      if (res.rowCount === 0) {
        isUnique = true;
      } else {
        id = generate10DigitId();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate a unique 10-digit Admin ID');
    }

    return id;
  }

  /**
   * Fetch all users who have role = 'admin'
   */
  async getAllAdmins(search?: string, status?: string): Promise<SanitizedUser[]> {
    let query = `
      SELECT * FROM users 
      WHERE role = 'admin'
    `;
    const params: any[] = [];

    if (status && ['active', 'inactive', 'banned'].includes(status)) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(fullname) LIKE $${params.length} 
        OR LOWER(email) LIKE $${params.length} 
        OR user_id LIKE $${params.length} 
        OR phone LIKE $${params.length}
      )`;
    }

    query += ` ORDER BY created_at DESC;`;

    const res = await pool.query<UserRow>(query, params);
    return res.rows.map((row) => this.sanitizeAdmin(row));
  }

  /**
   * Fetch a single admin by user_id
   */
  async getAdminById(userId: string): Promise<SanitizedUser> {
    const res = await pool.query<UserRow>(
      'SELECT * FROM users WHERE user_id = $1 AND role = $2',
      [userId, 'admin']
    );

    if (res.rowCount === 0) {
      throw new Error(`Admin with ID '${userId}' not found`);
    }

    return this.sanitizeAdmin(res.rows[0]);
  }

  /**
   * Create a new Admin account
   */
  async createAdmin(dto: CreateAdminDto): Promise<SanitizedUser> {
    const fullname = dto.fullname?.trim();
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!fullname) {
      throw new Error('Full name is required');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check duplicate email
    const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error(`An account with email '${email}' already exists`);
    }

    const userId = await this.generateUniqueAdminId();
    const passwordHash = await bcrypt.hash(password, 10);
    const status = dto.status || 'active';
    const phone = dto.phone?.trim() || null;
    const avatar = dto.avatar?.trim() || null;

    const query = `
      INSERT INTO users (
        user_id, fullname, email, password, phone, avatar, role, status, oauth_provider, email_verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'admin', $7, 'local', CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const res = await pool.query<UserRow>(query, [
      userId,
      fullname,
      email,
      passwordHash,
      phone,
      avatar,
      status,
    ]);

    return this.sanitizeAdmin(res.rows[0]);
  }

  /**
   * Update an existing Admin
   */
  async updateAdmin(userId: string, dto: UpdateAdminDto): Promise<SanitizedUser> {
    // 1. Verify admin exists
    const checkRes = await pool.query<UserRow>(
      'SELECT * FROM users WHERE user_id = $1 AND role = $2',
      [userId, 'admin']
    );
    if (checkRes.rowCount === 0) {
      throw new Error(`Admin with ID '${userId}' not found`);
    }

    const current = checkRes.rows[0];

    // 2. Validate email uniqueness if changed
    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== current.email) {
        const conflict = await pool.query(
          'SELECT 1 FROM users WHERE email = $1 AND user_id != $2',
          [email, userId]
        );
        if (conflict.rowCount && conflict.rowCount > 0) {
          throw new Error(`Email '${email}' is already in use by another user`);
        }
      }
    }

    const fullname = dto.fullname !== undefined ? dto.fullname.trim() : current.fullname;
    const email = dto.email !== undefined ? dto.email.trim().toLowerCase() : current.email;
    const phone = dto.phone !== undefined ? (dto.phone ? dto.phone.trim() : null) : current.phone;
    const status = dto.status !== undefined ? dto.status : current.status;
    const avatar = dto.avatar !== undefined ? (dto.avatar ? dto.avatar.trim() : null) : current.avatar;

    // Password handling: if provided and not empty, hash it; otherwise keep current
    let passwordHash = current.password;
    if (dto.password && dto.password.trim().length > 0) {
      if (dto.password.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updateQuery = `
      UPDATE users SET
        fullname = $1,
        email = $2,
        phone = $3,
        status = $4,
        avatar = $5,
        password = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $7 AND role = 'admin'
      RETURNING *;
    `;

    const res = await pool.query<UserRow>(updateQuery, [
      fullname,
      email,
      phone,
      status,
      avatar,
      passwordHash,
      userId,
    ]);

    return this.sanitizeAdmin(res.rows[0]);
  }

  /**
   * Delete an admin (with safeguard: cannot delete last active admin)
   */
  async deleteAdmin(userId: string): Promise<void> {
    // Check total active admins
    const countRes = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'"
    );
    const activeCount = parseInt(countRes.rows[0].count, 10);

    const targetRes = await pool.query<UserRow>(
      'SELECT * FROM users WHERE user_id = $1 AND role = $2',
      [userId, 'admin']
    );

    if (targetRes.rowCount === 0) {
      throw new Error(`Admin with ID '${userId}' not found`);
    }

    if (activeCount <= 1 && targetRes.rows[0].status === 'active') {
      throw new Error('Cannot delete the only remaining active administrator');
    }

    await pool.query('DELETE FROM users WHERE user_id = $1 AND role = $2', [userId, 'admin']);
  }
}

export const adminService = new AdminService();
