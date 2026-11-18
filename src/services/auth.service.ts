import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/environment';
import { generate10DigitId } from '../utils/idGenerator';
import { UserRow, SignupDto, LoginDto, GoogleAuthDto, SanitizedUser } from '../types/auth.types';

const googleClient = new OAuth2Client(config.googleClientId);

export class AuthService {
  /**
   * Helper to strip sensitive fields (password, tokens)
   */
  private sanitizeUser(user: UserRow): SanitizedUser {
    const avatarUrl = (user.has_avatar || user.avatar_blob)
      ? (user.role === 'admin' ? `/api/v1/admins/${user.user_id}/avatar` : `/api/v1/customers/${user.user_id}/avatar`)
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
      throw new Error('Failed to generate a unique 10-digit User ID');
    }

    return id;
  }

  /**
   * Password hashing helper
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare plaintext password against hash
   */
  private async comparePassword(password: string, hash?: string | null): Promise<boolean> {
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }

  /**
   * User Local Sign Up / Registration
   */
  async signup(dto: SignupDto): Promise<SanitizedUser> {
    const fullname = dto.fullname.trim();
    const email = dto.email.trim().toLowerCase();
    const password = dto.password?.trim();

    if (!fullname) {
      throw new Error('Full name is required');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if email already exists
    const checkQuery = 'SELECT 1 FROM users WHERE email = $1';
    const checkRes = await pool.query(checkQuery, [email]);
    if (checkRes.rowCount && checkRes.rowCount > 0) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const userId = await this.getUniqueUserId();
    const passwordHash = await this.hashPassword(password);
    const phone = dto.phone?.trim() || null;

    const insertQuery = `
      INSERT INTO users (
        user_id, fullname, email, password, phone, role, status, oauth_provider, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'customer', 'active', 'local', NOW(), NOW())
      RETURNING 
        user_id, fullname, email, phone, role, status, oauth_provider, email_verified_at, created_at, updated_at,
        (avatar_blob IS NOT NULL) AS has_avatar;
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
   * User Local Email + Password Login
   */
  async login(dto: LoginDto): Promise<SanitizedUser> {
    const email = dto.email.trim().toLowerCase();
    const password = dto.password?.trim();

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const findQuery = `
      SELECT 
        user_id, fullname, email, password, phone, role, status, oauth_provider, email_verified_at, created_at, updated_at,
        (avatar_blob IS NOT NULL) AS has_avatar
      FROM users 
      WHERE email = $1 
      LIMIT 1;
    `;
    const res = await pool.query<UserRow>(findQuery, [email]);

    if (res.rowCount === 0) {
      throw new Error('Invalid email or password');
    }

    const user = res.rows[0];

    // Check if user is suspended/banned
    if (user.status === 'banned') {
      throw new Error('Your account has been suspended. Please contact customer support.');
    }

    // Check password
    if (!user.password && user.oauth_provider === 'google') {
      throw new Error('This account was created with Google. Please use "Sign In with Google".');
    }

    const isMatch = await this.comparePassword(dto.password!, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Google OAuth Real Verification & Auto-Signup
   */
  async googleAuth(dto: GoogleAuthDto): Promise<SanitizedUser> {
    let email: string;
    let googleId: string;
    let fullname: string;
    let pictureUrl: string | undefined = dto.avatar;

    // 1. Cryptographically verify Google ID token if credential is provided
    if (dto.credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: dto.credential,
          audience: config.googleClientId,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new Error('Invalid or expired Google token');
        }
        email = payload.email.trim().toLowerCase();
        googleId = payload.sub;
        fullname = payload.name || email.split('@')[0];
        pictureUrl = payload.picture;
      } catch (err: any) {
        console.error('Google ID Token verification failed:', err);
        throw new Error('Google authentication verification failed: ' + (err.message || 'Invalid token'));
      }
    } else {
      // Fallback for mock/direct testing
      email = (dto.email || '').trim().toLowerCase();
      googleId = (dto.googleId || '').trim();
      fullname = dto.fullname?.trim() || email.split('@')[0];
    }

    if (!email) {
      throw new Error('Google email is required');
    }
    if (!googleId) {
      throw new Error('Google identifier is required');
    }

    // Optional: Download avatar from Google and store as binary BYTEA
    let avatarBlob: Buffer | null = null;
    let avatarMime: string = 'image/jpeg';
    if (pictureUrl && pictureUrl.startsWith('http')) {
      try {
        const imgResp = await fetch(pictureUrl);
        if (imgResp.ok) {
          const ab = await imgResp.arrayBuffer();
          avatarBlob = Buffer.from(ab);
          avatarMime = imgResp.headers.get('content-type') || 'image/jpeg';
        }
      } catch (e) {
        // Continue cleanly even if avatar download fails
      }
    }

    // 2. Look for user by email or by (oauth_provider, oauth_id)
    const findQuery = `
      SELECT 
        user_id, fullname, email, password, phone, role, status, oauth_provider, email_verified_at, created_at, updated_at,
        (avatar_blob IS NOT NULL) AS has_avatar
      FROM users 
      WHERE email = $1 OR (oauth_provider = 'google' AND oauth_id = $2)
      LIMIT 1;
    `;
    const res = await pool.query<UserRow>(findQuery, [email, googleId]);

    if (res.rowCount && res.rowCount > 0) {
      const user = res.rows[0];
      if (user.status === 'banned') {
        throw new Error('Your account has been suspended. Please contact customer support.');
      }

      // Ensure oauth_id is linked and avatar_blob updated if not already set
      const updateQuery = `
        UPDATE users 
        SET oauth_provider = 'google',
            oauth_id = COALESCE(oauth_id, $1),
            avatar_blob = COALESCE(avatar_blob, $2),
            avatar_mime = COALESCE(avatar_mime, $3),
            email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
            updated_at = NOW()
        WHERE user_id = $4
        RETURNING 
          user_id, fullname, email, phone, role, status, oauth_provider, email_verified_at, created_at, updated_at,
          (avatar_blob IS NOT NULL) AS has_avatar;
      `;
      const updatedRes = await pool.query<UserRow>(updateQuery, [
        googleId,
        avatarBlob,
        avatarMime,
        user.user_id,
      ]);

      return this.sanitizeUser(updatedRes.rows[0]);
    }

    // 3. User doesn't exist: Auto-register with guaranteed unique 10-digit ID
    const userId = await this.getUniqueUserId();

    const insertQuery = `
      INSERT INTO users (
        user_id, fullname, email, password, role, status, oauth_provider, oauth_id,
        avatar_blob, avatar_mime, email_verified_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, NULL, 'customer', 'active', 'google', $4,
        $5, $6, CURRENT_TIMESTAMP, NOW(), NOW()
      )
      RETURNING 
        user_id, fullname, email, phone, role, status, oauth_provider, email_verified_at, created_at, updated_at,
        (avatar_blob IS NOT NULL) AS has_avatar;
    `;

    const insertRes = await pool.query<UserRow>(insertQuery, [
      userId,
      fullname,
      email,
      googleId,
      avatarBlob,
      avatarMime,
    ]);

    return this.sanitizeUser(insertRes.rows[0]);
  }
}

export const authService = new AuthService();
