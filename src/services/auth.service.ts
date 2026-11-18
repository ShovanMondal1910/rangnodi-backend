import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { generate10DigitId } from '../utils/idGenerator';
import { UserRow, SignupDto, LoginDto, GoogleAuthDto, SanitizedUser } from '../types/auth.types';

export class AuthService {
  /**
   * Helper to strip sensitive fields (password, tokens)
   */
  private sanitizeUser(user: UserRow): SanitizedUser {
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
   * Generate a unique 10-digit user ID
   */
  private async getUniqueUserId(): Promise<string> {
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
      throw new Error('Failed to generate a unique 10-digit user ID. Please retry.');
    }

    return id;
  }

  /**
   * Safe bcrypt compare supporting $2y$, $2a$, $2b$
   */
  private async comparePassword(plain: string, hash: string): Promise<boolean> {
    try {
      // Normalize $2y$ prefix to $2a$ for bcryptjs compatibility
      const normalizedHash = hash.startsWith('$2y$') ? hash.replace('$2y$', '$2a$') : hash;
      return await bcrypt.compare(plain, normalizedHash);
    } catch {
      return false;
    }
  }

  /**
   * Register a new user (Sign Up)
   */
  async signup(dto: SignupDto): Promise<SanitizedUser> {
    const email = dto.email.trim().toLowerCase();
    const fullname = dto.fullname.trim();

    if (!fullname) {
      throw new Error('Full name is required');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check email uniqueness
    const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const userId = await this.getUniqueUserId();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const phone = dto.phone ? dto.phone.trim() : null;

    const insertQuery = `
      INSERT INTO users (
        user_id, fullname, email, password, phone, role, status, oauth_provider
      ) VALUES ($1, $2, $3, $4, $5, 'customer', 'active', 'local')
      RETURNING *;
    `;

    const res = await pool.query<UserRow>(insertQuery, [
      userId,
      fullname,
      email,
      passwordHash,
      phone,
    ]);

    return this.sanitizeUser(res.rows[0]);
  }

  /**
   * Email/Password Login
   */
  async login(dto: LoginDto): Promise<SanitizedUser> {
    const email = dto.email.trim().toLowerCase();

    if (!email) {
      throw new Error('Email is required');
    }
    if (!dto.password) {
      throw new Error('Password is required');
    }

    const res = await pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (res.rowCount === 0) {
      throw new Error('Invalid email or password');
    }

    const user = res.rows[0];

    if (user.status === 'banned') {
      throw new Error('Your account has been suspended. Please contact support.');
    }

    if (user.status === 'inactive') {
      throw new Error('Your account is currently inactive.');
    }

    if (!user.password) {
      if (user.oauth_provider === 'google') {
        throw new Error('This account was created with Google. Please use "Continue with Google".');
      }
      throw new Error('No password set for this account. Please sign in via social login.');
    }

    const isMatch = await this.comparePassword(dto.password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Google OAuth Login / Auto-Signup
   */
  async googleAuth(dto: GoogleAuthDto): Promise<SanitizedUser> {
    const email = dto.email.trim().toLowerCase();
    const googleId = dto.googleId.trim();

    if (!email) {
      throw new Error('Google email is required');
    }
    if (!googleId) {
      throw new Error('Google identifier is required');
    }

    // 1. Look for user by email or by (oauth_provider, oauth_id)
    const findQuery = `
      SELECT * FROM users 
      WHERE email = $1 OR (oauth_provider = 'google' AND oauth_id = $2)
      LIMIT 1;
    `;
    const res = await pool.query<UserRow>(findQuery, [email, googleId]);

    if (res.rowCount && res.rowCount > 0) {
      const user = res.rows[0];
      if (user.status === 'banned') {
        throw new Error('Your account has been suspended. Please contact customer support.');
      }

      // Update avatar and ensure oauth_id is linked
      const updateQuery = `
        UPDATE users 
        SET oauth_provider = 'google',
            oauth_id = COALESCE(oauth_id, $1),
            avatar = COALESCE($2, avatar),
            email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
        WHERE user_id = $3
        RETURNING *;
      `;
      const updatedRes = await pool.query<UserRow>(updateQuery, [
        googleId,
        dto.avatar || null,
        user.user_id,
      ]);

      return this.sanitizeUser(updatedRes.rows[0]);
    }

    // 2. User doesn't exist: Auto-register via Google
    const userId = await this.getUniqueUserId();
    const fullname = dto.fullname?.trim() || email.split('@')[0];

    const insertQuery = `
      INSERT INTO users (
        user_id, fullname, email, password, avatar, role, status, oauth_provider, oauth_id, email_verified_at
      ) VALUES ($1, $2, $3, NULL, $4, 'customer', 'active', 'google', $5, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const insertRes = await pool.query<UserRow>(insertQuery, [
      userId,
      fullname,
      email,
      dto.avatar || null,
      googleId,
    ]);

    return this.sanitizeUser(insertRes.rows[0]);
  }
}

export const authService = new AuthService();
