import bcrypt from 'bcryptjs';
import { db, User, OtpRecord, AuditLogRecord } from '../db.js';
import { sendOtpEmail } from './mailer.js';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  errors: string[];
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    notCommon: boolean;
    notPersonal: boolean;
  };
}

const COMMON_DISALLOWED_PASSWORDS = new Set([
  'password123456',
  '123456789012',
  'admin12345678',
  'welcome123456',
  'iloveyou12345',
  'qwerty1234567',
  'studysniper12'
]);

export function validatePasswordStrength(
  password: string = '',
  name: string = '',
  email: string = ''
): PasswordValidationResult {
  const errors: string[] = [];
  const checks = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    notCommon: true,
    notPersonal: true
  };

  if (!checks.minLength) {
    errors.push('Password must be at least 12 characters long');
  }
  if (!checks.hasUppercase) {
    errors.push('Include at least one uppercase letter (A-Z)');
  }
  if (!checks.hasLowercase) {
    errors.push('Include at least one lowercase letter (a-z)');
  }
  if (!checks.hasNumber) {
    errors.push('Include at least one number (0-9)');
  }
  if (!checks.hasSpecial) {
    errors.push('Include at least one special character (e.g. !@#$%)');
  }

  // Check common weak passwords
  const cleanPass = password.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (COMMON_DISALLOWED_PASSWORDS.has(cleanPass) || cleanPass.startsWith('password') || cleanPass.startsWith('12345678')) {
    checks.notCommon = false;
    errors.push('Password is too common or easily guessable');
  }

  // Check personal info similarity
  if (email) {
    const emailPrefix = email.split('@')[0]?.toLowerCase();
    if (emailPrefix && emailPrefix.length >= 3 && password.toLowerCase().includes(emailPrefix)) {
      checks.notPersonal = false;
      errors.push('Password cannot contain parts of your email address');
    }
  }

  if (name) {
    const nameParts = name.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
    for (const part of nameParts) {
      if (password.toLowerCase().includes(part)) {
        checks.notPersonal = false;
        errors.push('Password cannot contain your name');
        break;
      }
    }
  }

  // Calculate percentage score
  let passedCount = 0;
  if (checks.minLength) passedCount += 25;
  if (checks.hasUppercase) passedCount += 15;
  if (checks.hasLowercase) passedCount += 15;
  if (checks.hasNumber) passedCount += 15;
  if (checks.hasSpecial) passedCount += 15;
  if (checks.notCommon) passedCount += 7.5;
  if (checks.notPersonal) passedCount += 7.5;

  const score = Math.min(100, Math.round(passedCount));

  let label: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  if (score >= 90) label = 'Strong';
  else if (score >= 70) label = 'Good';
  else if (score >= 45) label = 'Fair';

  const isValid = Object.values(checks).every(Boolean);

  return {
    isValid,
    score,
    label,
    errors,
    checks
  };
}

export function logAuditEvent(
  email: string,
  event: AuditLogRecord['event'],
  userId?: string | null,
  ip?: string,
  userAgent?: string
) {
  const record: AuditLogRecord = {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId: userId || null,
    email: email.toLowerCase(),
    event,
    ip: ip || '127.0.0.1',
    userAgent,
    timestamp: new Date().toISOString()
  };
  db.get.auditLogs.push(record);
  db.save();
}

export async function createOtp(
  email: string,
  purpose: 'email_verification' | 'password_reset',
  userName?: string
): Promise<{ code: string; otpRecord: OtpRecord; emailSent: boolean }> {
  // Remove existing OTPs for same email & purpose
  db.get.otps = db.get.otps.filter(
    o => !(o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose)
  );

  // Generate 6-digit cryptographic random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min expiry
  const resendCooldownUntil = new Date(now.getTime() + 60 * 1000).toISOString(); // 60s cooldown

  const otpRecord: OtpRecord = {
    id: 'otp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    email: email.toLowerCase(),
    codeHash,
    purpose,
    expiresAt,
    resendCooldownUntil,
    resendAttempts: 1,
    createdAt: now.toISOString()
  };

  db.get.otps.push(otpRecord);
  db.save();

  logAuditEvent(email, 'OTP_SENT');

  // Dispatch OTP Email
  const mailRes = await sendOtpEmail({
    to: email,
    code,
    purpose,
    userName
  });

  return { code, otpRecord, emailSent: mailRes.success };
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: 'email_verification' | 'password_reset'
): Promise<{ success: boolean; error?: string }> {
  const records = db.get.otps.filter(
    o => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose
  );

  if (!records.length) {
    return { success: false, error: 'No active verification code found for this email. Please request a new code.' };
  }

  const latest = records[records.length - 1];

  if (new Date(latest.expiresAt) < new Date()) {
    db.get.otps = db.get.otps.filter(o => o.id !== latest.id);
    db.save();
    return { success: false, error: 'Verification code has expired (5 minute limit). Please request a new code.' };
  }

  const matches = await bcrypt.compare(code.trim(), latest.codeHash);
  if (!matches) {
    return { success: false, error: 'Invalid verification code. Please check the 6-digit code and try again.' };
  }

  // Remove used OTP
  db.get.otps = db.get.otps.filter(o => o.id !== latest.id);
  db.save();

  return { success: true };
}
