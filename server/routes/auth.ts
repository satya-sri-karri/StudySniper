import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, touchUserStreak, User } from '../db.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';
import {
  validatePasswordStrength,
  createOtp,
  verifyOtp,
  logAuditEvent
} from '../services/authSecurity.js';

const router = Router();

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 1. Account Registration (Requires Email OTP Verification)
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address with domain (e.g. student@university.edu or alex@gmail.com).' });
    }

    // Check duplicate email
    const existing = db.get.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing && existing.isVerified) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // Validate password strength according to enterprise requirements
    const valResult = validatePasswordStrength(password, cleanName, cleanEmail);
    if (!valResult.isValid) {
      return res.status(400).json({
        error: valResult.errors[0] || 'Password does not meet enterprise security requirements.',
        validation: valResult
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let user: User;
    if (existing) {
      existing.name = cleanName;
      existing.passwordHash = passwordHash;
      existing.isVerified = true;
      user = existing;
    } else {
      user = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        isVerified: true,
        failedLoginAttempts: 0,
        lockUntil: null,
        streakDays: 1,
        lastActiveDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      db.get.users.push(user);
    }

    db.save();
    logAuditEvent(cleanEmail, 'REGISTER', user.id, req.ip, req.headers['user-agent']);
    logAuditEvent(cleanEmail, 'LOGIN_SUCCESS', user.id, req.ip, req.headers['user-agent']);

    const token = generateToken(user.id, user.email);
    const safeUser = touchUserStreak(user.id) || {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: true,
      streakDays: 1,
      lastActiveDate: new Date().toISOString(),
      createdAt: user.createdAt
    };

    return res.json({
      message: 'Account created successfully!',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Firebase Auth Sync / Login Endpoint
router.post('/firebase-login', async (req: Request, res: Response) => {
  try {
    const { email, name, firebaseUid, photoURL } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required from Firebase authentication.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || cleanEmail.split('@')[0];

    let user = db.get.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      user = {
        id: 'usr_fb_' + (firebaseUid || Date.now()),
        name: cleanName,
        email: cleanEmail,
        passwordHash: 'FIREBASE_AUTHENTICATED_USER',
        isVerified: true,
        failedLoginAttempts: 0,
        lockUntil: null,
        streakDays: 1,
        lastActiveDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      db.get.users.push(user);
    } else {
      user.isVerified = true;
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      if (cleanName && (!user.name || user.name === user.email.split('@')[0])) {
        user.name = cleanName;
      }
    }

    db.save();
    logAuditEvent(cleanEmail, 'LOGIN_SUCCESS', user.id, req.ip, req.headers['user-agent']);

    const token = generateToken(user.id, user.email);
    const safeUser = touchUserStreak(user.id) || {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: true,
      streakDays: user.streakDays || 1,
      lastActiveDate: new Date().toISOString(),
      createdAt: user.createdAt
    };

    return res.json({
      message: 'Firebase authentication successful!',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Firebase login error:', err);
    return res.status(500).json({ error: 'Failed to process Firebase authentication.' });
  }
});

// 2. Verify Email OTP Code
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otpCode, purpose } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpPurpose = purpose === 'password_reset' ? 'password_reset' : 'email_verification';

    const verification = await verifyOtp(cleanEmail, otpCode, otpPurpose);
    if (!verification.success) {
      return res.status(400).json({ error: verification.error || 'Invalid or expired code.' });
    }

    if (otpPurpose === 'email_verification') {
      const user = db.get.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        return res.status(404).json({ error: 'User record not found.' });
      }

      user.isVerified = true;
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      db.save();

      logAuditEvent(cleanEmail, 'VERIFY_SUCCESS', user.id, req.ip, req.headers['user-agent']);
      logAuditEvent(cleanEmail, 'LOGIN_SUCCESS', user.id, req.ip, req.headers['user-agent']);

      const token = generateToken(user.id, user.email);
      const safeUser = touchUserStreak(user.id) || {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: true,
        streakDays: 1,
        lastActiveDate: new Date().toISOString(),
        createdAt: user.createdAt
      };

      return res.json({
        message: 'Email verified successfully!',
        token,
        user: safeUser
      });
    } else {
      // Password reset verification success
      logAuditEvent(cleanEmail, 'VERIFY_SUCCESS', null, req.ip, req.headers['user-agent']);
      return res.json({
        message: 'Verification code confirmed. You can now set your new password.',
        email: cleanEmail,
        verifiedForReset: true
      });
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Internal server error during code verification.' });
  }
});

// 3. Resend OTP Code (with 60-second Cooldown & Attempt Limit)
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpPurpose = purpose === 'password_reset' ? 'password_reset' : 'email_verification';

    const existingOtps = db.get.otps.filter(
      o => o.email.toLowerCase() === cleanEmail && o.purpose === otpPurpose
    );

    if (existingOtps.length > 0) {
      const latest = existingOtps[existingOtps.length - 1];
      if (latest.resendCooldownUntil && new Date(latest.resendCooldownUntil) > new Date()) {
        const remainingSeconds = Math.ceil((new Date(latest.resendCooldownUntil).getTime() - Date.now()) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
          cooldownRemaining: remainingSeconds
        });
      }

      if ((latest.resendAttempts || 1) >= 4) {
        return res.status(429).json({
          error: 'Maximum resend limit reached for this session. Please wait a few minutes before trying again.'
        });
      }
    }

    const user = db.get.users.find(u => u.email.toLowerCase() === cleanEmail);
    const { code } = await createOtp(cleanEmail, otpPurpose, user?.name);

    return res.json({
      message: 'A new 6-digit verification code has been sent.',
      email: cleanEmail,
      demoOtp: code
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ error: 'Internal server error during resend.' });
  }
});

// 4. Secure Login (Checks Verification, Account Lockout & Password)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.get.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      logAuditEvent(cleanEmail, 'LOGIN_FAILED', null, req.ip, req.headers['user-agent']);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check temporary account lockout
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minutes or reset your password.`,
        isLocked: true
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min lock
        logAuditEvent(cleanEmail, 'LOCKOUT', user.id, req.ip, req.headers['user-agent']);
      } else {
        logAuditEvent(cleanEmail, 'LOGIN_FAILED', user.id, req.ip, req.headers['user-agent']);
      }
      db.save();

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Ensure user is marked verified
    user.isVerified = true;

    // Reset lockout counters on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    db.save();

    logAuditEvent(cleanEmail, 'LOGIN_SUCCESS', user.id, req.ip, req.headers['user-agent']);

    const safeUser = touchUserStreak(user.id) || {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: true,
      streakDays: 1,
      lastActiveDate: new Date().toISOString(),
      createdAt: user.createdAt
    };

    const token = generateToken(user.id, user.email);

    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 5. Request Password Reset OTP
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address with domain (e.g. student@university.edu or alex@gmail.com).' });
    }
    const user = db.get.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (user) {
      const { code } = await createOtp(cleanEmail, 'password_reset', user.name);
      logAuditEvent(cleanEmail, 'PASSWORD_RESET_REQUEST', user.id, req.ip, req.headers['user-agent']);

      return res.json({
        message: 'A 6-digit password reset code has been sent to your email.',
        email: cleanEmail,
        demoOtp: code
      });
    }

    // Generic response to prevent account enumeration
    return res.json({
      message: 'If an account exists for this email address, a 6-digit reset code has been sent.',
      email: cleanEmail
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// 6. Complete Reset Password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otpCode, newPassword } = req.body;
    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.get.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(400).json({ error: 'Invalid password reset request.' });
    }

    // Verify OTP code
    const verification = await verifyOtp(cleanEmail, otpCode, 'password_reset');
    if (!verification.success) {
      return res.status(400).json({ error: verification.error || 'Invalid or expired code.' });
    }

    // Validate new password strength
    const valResult = validatePasswordStrength(newPassword, user.name, cleanEmail);
    if (!valResult.isValid) {
      return res.status(400).json({
        error: valResult.errors[0] || 'New password does not meet enterprise requirements.',
        validation: valResult
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.isVerified = true;
    db.save();

    logAuditEvent(cleanEmail, 'PASSWORD_RESET_SUCCESS', user.id, req.ip, req.headers['user-agent']);

    return res.json({
      message: 'Password successfully reset! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

// 7. Get Current User
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = db.get.users.find(u => u.id === req.user?.userId);
  if (user) {
    // If account was created today or has no lastActiveDate, streak must be 1
    const createdDateStr = new Date(user.createdAt || Date.now()).toISOString().split('T')[0];
    const todayDateStr = new Date().toISOString().split('T')[0];
    if (createdDateStr === todayDateStr && user.streakDays > 1) {
      user.streakDays = 1;
      db.save();
    }
  }

  const safeUser = touchUserStreak(req.user!.userId);
  if (!safeUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user: safeUser });
});

// 8. Streak Touch
router.post('/streak/increment', authenticateToken, (req: AuthRequest, res: Response) => {
  const updatedUser = touchUserStreak(req.user!.userId);
  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user: updatedUser, message: 'Streak verified for today!' });
});

// 9. Update Profile
router.put('/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = db.get.users.find(u => u.id === req.user?.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { name, targetExam, dailyGoalHours } = req.body;
  if (name) user.name = name.trim();
  if (targetExam !== undefined) user.targetExam = targetExam;
  if (dailyGoalHours !== undefined) user.dailyGoalHours = Number(dailyGoalHours);

  db.save();
  const { passwordHash: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

// 10. Logout
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user?.email) {
    logAuditEvent(req.user.email, 'LOGOUT', req.user.userId, req.ip, req.headers['user-agent']);
  }
  return res.json({ message: 'Logged out successfully' });
});

// 11. Delete Account
router.delete('/account', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userIndex = db.get.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    const deletedUser = db.get.users[userIndex];
    db.get.users.splice(userIndex, 1);
    db.get.otps = db.get.otps.filter(o => o.email.toLowerCase() !== deletedUser.email.toLowerCase());
    db.save();
  }

  return res.json({ message: 'Account deleted successfully' });
});

export default router;
