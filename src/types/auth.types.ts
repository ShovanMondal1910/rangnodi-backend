export type UserRole = 'customer' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'banned';

export interface UserRow {
  user_id: string;
  fullname: string;
  email: string;
  password?: string | null;
  avatar_blob?: Buffer | null;
  avatar_mime?: string | null;
  has_avatar?: boolean;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  oauth_provider: string;
  oauth_id?: string | null;
  email_verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SignupDto {
  fullname: string;
  email: string;
  password?: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password?: string;
}

export interface GoogleAuthDto {
  googleId: string;
  email: string;
  fullname: string;
  avatar?: string;
}

export interface SanitizedUser {
  user_id: string;
  fullname: string;
  email: string;
  avatar?: string | null;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  oauth_provider: string;
  email_verified_at?: Date | null;
  created_at: Date;
}
