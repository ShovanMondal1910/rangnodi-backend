import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { generate10DigitId } from '../utils/idGenerator';
import { parseBase64Image, isBase64Image } from '../utils/imageParser';
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
    const avatarUrl = (user.has_avatar || user.avatar_blob)
      ? `/api/v1/admins/${user.user_id}/avatar`
      : null;

    return {
      user_id: user.user_id,
      fullname: user.fullname,
      email: user.email,
      avatar: avatarUrl,
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
   * Retrieve binary avatar photo for an admin
   */
  async getAdminAvatar(userId: string): Promise<{ blob: Buffer; mime: string } | null> {
    const res = await pool.query<{ avatar_blob: Buffer | null; avatar_mime: string | null }>(
      'SELECT avatar_blob, avatar_mime FROM users WHERE user_id = $1',
      [userId]
    );

    if (res.rowCount === 0 || !res.rows[0].avatar_blob) {
      return null;
    }

    return {
      blob: res.rows[0].avatar_blob,
      mime: res.rows[0].avatar_mime || 'image/jpeg',
    };
  }

  /**
   * Fetch all users who have role = 'admin'
   */
  async getAllAdmins(search?: string, status?: string): Promise<SanitizedUser[]> {
    let query = `
      SELECT 
        user_id, fullname, email, phone, role, status, oauth_provider, 
        email_verified_at, created_at, updated_at, 
        (avatar_blob IS NOT NULL) AS has_avatar 
      FROM users 
      WHERE role = 'admin'
    `;
    const params: any[] = [];

    if (status && ['active', 'inactive', 'banned'].includes(status)) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search && search.trim().length > 0) {
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
      `SELECT 
        user_id, fullname, email, phone, role, status, oauth_provider, 
        email_verified_at, created_at, updated_at, 
        (avatar_blob IS NOT NULL) AS has_avatar 
      FROM users WHERE user_id = $1 AND role = $2`,
      [userId, 'admin']
    );

    if (res.rowCount === 0) {
      throw new Error(`Admin with ID '${userId}' not found`);
    }

    return this.sanitizeAdmin(res.rows[0]);
  }

  /**
   * Create a new Admin
   */
  async createAdmin(dto: CreateAdminDto): Promise<SanitizedUser> {
    const fullname = dto.fullname.trim();
    const email = dto.email.trim().toLowerCase();
    const password = dto.password.trim();

    if (!fullname) {
      throw new Error('Full name is required');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
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

    let avatarBlob: Buffer | null = null;
    let avatarMime: string = 'image/jpeg';

    if (dto.avatar && isBase64Image(dto.avatar)) {
      const parsed = parseBase64Image(dto.avatar);
      avatarBlob = parsed.buffer;
      avatarMime = parsed.mime;
    }

    const query = `
      INSERT INTO users (
        user_id, fullname, email, password, phone, avatar_blob, avatar_mime, role, status, oauth_provider, email_verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', $8, 'local', CURRENT_TIMESTAMP)
      RETURNING 
        user_id, fullname, email, phone, role, status, oauth_provider, 
        email_verified_at, created_at, updated_at, 
        (avatar_blob IS NOT NULL) AS has_avatar;
    `;

    const res = await pool.query<UserRow>(query, [
      userId,
      fullname,
      email,
      passwordHash,
      phone,
      avatarBlob,
      avatarMime,
      status,
    ]);

    return this.sanitizeAdmin(res.rows[0]);
  }

  /**
   * Update an existing Admin
   */
  async updateAdmin(userId: string, dto: UpdateAdminDto): Promise<SanitizedUser> {
    const checkRes = await pool.query<UserRow>(
      `SELECT 
        user_id, fullname, email, password, phone, 
        (avatar_blob IS NOT NULL) AS has_avatar 
      FROM users WHERE user_id = $1 AND role = $2`,
      [userId, 'admin']
    );
    if (checkRes.rowCount === 0) {
      throw new Error(`Admin with ID '${userId}' not found`);
    }

    const current = checkRes.rows[0];

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

    let passwordHash = current.password;
    if (dto.password && dto.password.trim().length > 0) {
      if (dto.password.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    let avatarBlob: Buffer | null = null;
    let avatarMime: string = 'image/jpeg';
    let updateAvatarBlob = false;

    if (dto.avatar !== undefined) {
      updateAvatarBlob = true;
      if (dto.avatar && isBase64Image(dto.avatar)) {
        const parsed = parseBase64Image(dto.avatar);
        avatarBlob = parsed.buffer;
        avatarMime = parsed.mime;
      } else {
        avatarBlob = null;
        avatarMime = 'image/jpeg';
      }
    }

    let updateQuery: string;
    let params: any[];

    if (updateAvatarBlob) {
      updateQuery = `
        UPDATE users SET
          fullname = $1,
          email = $2,
          phone = $3,
          status = $4,
          avatar_blob = $5,
          avatar_mime = $6,
          password = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $8 AND role = 'admin'
        RETURNING 
          user_id, fullname, email, phone, role, status, oauth_provider, 
          email_verified_at, created_at, updated_at, 
          (avatar_blob IS NOT NULL) AS has_avatar;
      `;
      params = [fullname, email, phone, status, avatarBlob, avatarMime, passwordHash, userId];
    } else {
      updateQuery = `
        UPDATE users SET
          fullname = $1,
          email = $2,
          phone = $3,
          status = $4,
          password = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6 AND role = 'admin'
        RETURNING 
          user_id, fullname, email, phone, role, status, oauth_provider, 
          email_verified_at, created_at, updated_at, 
          (avatar_blob IS NOT NULL) AS has_avatar;
      `;
      params = [fullname, email, phone, status, passwordHash, userId];
    }

    const res = await pool.query<UserRow>(updateQuery, params);
    return this.sanitizeAdmin(res.rows[0]);
  }

  /**
   * Delete an Admin (prevent self-deletion or deleting last active admin)
   */
  async deleteAdmin(userId: string): Promise<void> {
    const check = await pool.query(
      'SELECT role FROM users WHERE user_id = $1 AND role = $2',
      [userId, 'admin']
    );
    if (check.rowCount === 0) {
      throw new Error(`Admin with ID '${userId}' not found`);
    }

    const adminCount = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'"
    );
    const count = parseInt(adminCount.rows[0]?.count || '0', 10);
    if (count <= 1) {
      throw new Error('Cannot delete the last remaining active Administrator');
    }

    await pool.query('DELETE FROM users WHERE user_id = $1 AND role = $2', [userId, 'admin']);
  }
}

export const adminService = new AdminService();
