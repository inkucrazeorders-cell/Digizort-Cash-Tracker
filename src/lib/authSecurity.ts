/**
 * DIGIZORT Secure Authentication & Cryptographic Utilities
 *
 * Implements PBKDF2 password hashing with SHA-256 and unique per-user salts
 * using the browser's native Web Crypto API (SubtleCrypto).
 *
 * CRITICAL SECURITY PRINCIPLES:
 * 1. Plaintext passwords are NEVER stored in Firestore or localStorage.
 * 2. Plaintext passwords are NEVER sent in WhatsApp messages or logs.
 * 3. Admins can NEVER view user passwords.
 * 4. Passwords are salted with 16 bytes of cryptographically secure random data
 *    and stretched with 100,000 PBKDF2 iterations.
 */

const PBKDF2_ITERATIONS = 100000;
const HASH_LENGTH_BITS = 256;

// Convert Uint8Array to Hex string
function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generates a cryptographically random salt (16 bytes) as a hex string.
 */
export function generateSaltHex(): string {
  const saltBytes = new Uint8Array(16);
  window.crypto.getRandomValues(saltBytes);
  return bufferToHex(saltBytes);
}

/**
 * Hashes a plaintext password using PBKDF2 with SHA-256 and a 16-byte salt.
 * Returns the derived hash (hex) and the salt (hex).
 */
export async function hashPassword(
  password: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password cannot be empty.');
  }

  const salt = saltHex || generateSaltHex();
  const saltBytes = hexToBuffer(salt);
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    HASH_LENGTH_BITS
  );

  return {
    hash: bufferToHex(derivedBits),
    salt,
  };
}

/**
 * Verifies a candidate password against stored hash and salt.
 * Constant-time comparison prevents timing attacks.
 */
export async function verifyPassword(
  candidatePassword: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  if (!candidatePassword || !storedHash || !storedSalt) {
    return false;
  }

  try {
    const { hash: computedHash } = await hashPassword(candidatePassword, storedSalt);
    if (computedHash.length !== storedHash.length) {
      return false;
    }

    // Constant-time character comparison
    let mismatch = 0;
    for (let i = 0; i < computedHash.length; i++) {
      mismatch |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Password strength and requirement validation.
 */
export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (!password || password.trim().length === 0) {
    return { valid: false, message: 'Password cannot be empty.' };
  }
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long.',
    };
  }
  return { valid: true };
}

/**
 * In-memory & localStorage-backed login rate limiter to protect against brute-force attempts.
 * Max 5 failed attempts per phone number. Lockout duration: 2 minutes.
 */
interface RateLimitRecord {
  attempts: number;
  firstAttemptTime: number;
  lockoutUntil: number;
}

const RATE_LIMIT_PREFIX = 'dz_auth_rl_';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function getRateLimitRecord(key: string): RateLimitRecord | null {
  try {
    const raw = localStorage.getItem(`${RATE_LIMIT_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setRateLimitRecord(key: string, record: RateLimitRecord) {
  try {
    localStorage.setItem(`${RATE_LIMIT_PREFIX}${key}`, JSON.stringify(record));
  } catch {
    // Ignore storage quota errors
  }
}

export function checkLoginRateLimit(identifier: string): {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsRemaining: number;
} {
  const cleanId = identifier.trim().toLowerCase();
  const record = getRateLimitRecord(cleanId);
  const now = Date.now();

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, attemptsRemaining: MAX_FAILED_ATTEMPTS };
  }

  // Check active lockout
  if (record.lockoutUntil && record.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, attemptsRemaining: 0 };
  }

  // Reset if attempt window expired
  if (now - record.firstAttemptTime > ATTEMPT_WINDOW_MS) {
    clearLoginRateLimit(cleanId);
    return { isLocked: false, remainingSeconds: 0, attemptsRemaining: MAX_FAILED_ATTEMPTS };
  }

  const attemptsRemaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts);
  return { isLocked: false, remainingSeconds: 0, attemptsRemaining };
}

export function recordFailedLogin(identifier: string): {
  isLocked: boolean;
  remainingSeconds: number;
} {
  const cleanId = identifier.trim().toLowerCase();
  const now = Date.now();
  const record = getRateLimitRecord(cleanId) || {
    attempts: 0,
    firstAttemptTime: now,
    lockoutUntil: 0,
  };

  record.attempts += 1;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    setRateLimitRecord(cleanId, record);
    return { isLocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  setRateLimitRecord(cleanId, record);
  return { isLocked: false, remainingSeconds: 0 };
}

export function clearLoginRateLimit(identifier: string) {
  try {
    const cleanId = identifier.trim().toLowerCase();
    localStorage.removeItem(`${RATE_LIMIT_PREFIX}${cleanId}`);
  } catch {
    // Ignore
  }
}
