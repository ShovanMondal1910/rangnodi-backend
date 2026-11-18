import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { generate10DigitId } from '../utils/idGenerator';
import { parseBase64Image, isBase64Image } from '../utils/imageParser';
import { UserRow, SanitizedUser, UserStatus } from '../types/auth.types';

export interface CreateCustomerDto {
  fullname: string;
  email: string;
  password?: string | null;
  phone?: string | null;
  status?: UserStatus;
  avatar?: string | null;
}

export interface UpdateCustomerDto {
  fullname?: string;
  email?: string;
  password?: string | null;
  phone?: string | null;
  status?: UserStatus;
  avatar?: string | null;
}

export class CustomerService {
  private sanitizeCustomer(user: UserRow): SanitizedUser {
    const avatarUrl = (user.has_avatar || user.avatar_blob)
      ? `/api/v1/customers/${user.user_id}/avatar`
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
   * Generates a guaranteed-unique 10-digit ID for a new Customer
   */
  async generateUniqueCustomerId(): Promise<string> {
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
      throw new Error('Failed to generate a unique 10-digit Customer ID');
    }

    return id;
  }

  /**
   * Retrieve binary avatar photo for a customer
   */
  async getCustomerAvatar(userId: string): Promise<{ blob: Buffer; mime: string } | null> {
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
   * Fetch all users who have role = 'customer'
   * Note: uses (avatar_blob IS NOT NULL) AS has_avatar
   */
  async getAllCustomers(search?: string, status?: string): Promise<SanitizedUser[]> {
    let query = `
      SELECT 
        user_id,
        fullname,
        email,
        phone,
        role,
        status,
        oauth_provider,
        email_verified_at,
        created_at,
        updated_at,
        (avatar_blob IS NOT NULL) AS has_avatar
      FROM users 
      WHERE role = 'customer'
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
    return res.rows.map((row) => this.sanitizeCustomer(row));
  }

  /**
   * Fetch a single customer by user_id
   */
  async getCustomerById(userId: string): Promise<SanitizedUser> {
    const res = await pool.query<UserRow>(
      `SELECT 
        user_id,
        fullname,
        email,
        phone,
        role,
        status,
        oauth_provider,
        email_verified_at,
        created_at,
        updated_at,
        (avatar_blob IS NOT NULL) AS has_avatar
      FROM users WHERE user_id = $1 AND role = $2`,
      [userId, 'customer']
    );

    if (res.rowCount === 0) {
      throw new Error(`Customer with ID '${userId}' not found`);
    }

    return this.sanitizeCustomer(res.rows[0]);
  }

  /**
   * Create a new Customer account with binary avatar support
   */
  async createCustomer(dto: CreateCustomerDto): Promise<SanitizedUser> {
    const fullname = dto.fullname?.trim();
    const email = dto.email?.trim().toLowerCase();
    const rawPassword = dto.password?.trim() || 'Customer@1234';

    if (!fullname) {
      throw new Error('Full name is required');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }

    // Check duplicate email
    const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error(`An account with email '${email}' already exists`);
    }

    const userId = await this.generateUniqueCustomerId();
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const phone = dto.phone?.trim() || null;
    const status: UserStatus = dto.status || 'active';

    let avatarBlob: Buffer | null = null;
    let avatarMime: string = 'image/jpeg';

    if (dto.avatar && isBase64Image(dto.avatar)) {
      const parsed = parseBase64Image(dto.avatar);
      avatarBlob = parsed.buffer;
      avatarMime = parsed.mime;
    }

    const insertQuery = `
      INSERT INTO users (
        user_id,
        fullname,
        email,
        password,
        phone,
        role,
        status,
        avatar_blob,
        avatar_mime,
        oauth_provider,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'customer', $6, $7, $8, 'local', NOW(), NOW()
      )
      RETURNING 
        user_id,
        fullname,
        email,
        phone,
        role,
        status,
        oauth_provider,
        email_verified_at,
        created_at,
        updated_at,
        (avatar_blob IS NOT NULL) AS has_avatar;
    `;

    const res = await pool.query<UserRow>(insertQuery, [
      userId,
      fullname,
      email,
      passwordHash,
      phone,
      status,
      avatarBlob,
      avatarMime,
    ]);

    return this.sanitizeCustomer(res.rows[0]);
  }

  /**
   * Update an existing Customer account
   */
  async updateCustomer(userId: string, dto: UpdateCustomerDto): Promise<SanitizedUser> {
    const checkRes = await pool.query<UserRow>(
      `SELECT 
        user_id,
        fullname,
        email,
        password,
        phone,
        role,
        status,
        (avatar_blob IS NOT NULL) AS has_avatar
      FROM users WHERE user_id = $1 AND role = $2`,
      [userId, 'customer']
    );

    if (checkRes.rowCount === 0) {
      throw new Error(`Customer with ID '${userId}' not found`);
    }

    const current = checkRes.rows[0];
    const fullname = dto.fullname !== undefined ? dto.fullname.trim() : current.fullname;
    const phone = dto.phone !== undefined ? (dto.phone?.trim() || null) : current.phone;
    const status = dto.status || current.status;

    let email = current.email;
    if (dto.email && dto.email.trim().toLowerCase() !== current.email) {
      const newEmail = dto.email.trim().toLowerCase();
      const dupCheck = await pool.query(
        'SELECT 1 FROM users WHERE email = $1 AND user_id != $2',
        [newEmail, userId]
      );
      if (dupCheck.rowCount && dupCheck.rowCount > 0) {
        throw new Error(`Email '${newEmail}' is already in use by another account`);
      }
      email = newEmail;
    }

    let passwordHash = current.password;
    if (dto.password && dto.password.trim()) {
      if (dto.password.trim().length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      passwordHash = await bcrypt.hash(dto.password.trim(), 10);
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
          password = $3,
          phone = $4,
          status = $5,
          avatar_blob = $6,
          avatar_mime = $7,
          updated_at = NOW()
        WHERE user_id = $8 AND role = 'customer'
        RETURNING 
          user_id,
          fullname,
          email,
          phone,
          role,
          status,
          oauth_provider,
          email_verified_at,
          created_at,
          updated_at,
          (avatar_blob IS NOT NULL) AS has_avatar;
      `;
      params = [fullname, email, passwordHash, phone, status, avatarBlob, avatarMime, userId];
    } else {
      updateQuery = `
        UPDATE users SET
          fullname = $1,
          email = $2,
          password = $3,
          phone = $4,
          status = $5,
          updated_at = NOW()
        WHERE user_id = $6 AND role = 'customer'
        RETURNING 
          user_id,
          fullname,
          email,
          phone,
          role,
          status,
          oauth_provider,
          email_verified_at,
          created_at,
          updated_at,
          (avatar_blob IS NOT NULL) AS has_avatar;
      `;
      params = [fullname, email, passwordHash, phone, status, userId];
    }

    const res = await pool.query<UserRow>(updateQuery, params);
    return this.sanitizeCustomer(res.rows[0]);
  }

  /**
   * Delete a Customer account
   */
  async deleteCustomer(userId: string): Promise<void> {
    const check = await pool.query(
      'SELECT 1 FROM users WHERE user_id = $1 AND role = $2',
      [userId, 'customer']
    );
    if (check.rowCount === 0) {
      throw new Error(`Customer with ID '${userId}' not found`);
    }

    await pool.query('DELETE FROM users WHERE user_id = $1 AND role = $2', [userId, 'customer']);
  }
}

export const customerService = new CustomerService();
