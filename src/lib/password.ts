import { hash, compare } from 'bcryptjs'

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12) // 12 rounds - good balance of security and performance
}

/**
 * Verify a password against a hash
 * @param password Plain text password
 * @param hashedPassword Hashed password from database
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

