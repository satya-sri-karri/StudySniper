import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { OtpInput } from './OtpInput';
import { auth, googleProvider, formatFirebaseError } from '../../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Loader2,
  Target,
  Key,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Flame
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    pendingEmail,
    setPendingEmail,
    demoOtp,
    setDemoOtp,
    login,
    showToast
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Cooldown timer state for resending OTP
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!authModalOpen) return null;

  const currentEmail = pendingEmail || email;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (fbUser.email) {
        const res = await api.firebaseLogin({
          email: fbUser.email,
          name: fbUser.displayName || undefined,
          firebaseUid: fbUser.uid,
          photoURL: fbUser.photoURL || undefined
        });
        login(res.token, res.user);
        showToast(`Signed in via Firebase Google Auth as ${res.user.name}!`, 'success');
      } else {
        setError('Google Sign-In did not return an email address.');
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (authModalMode === 'login') {
        // Try Firebase Auth login first, fallback to standard database auth
        try {
          const fbCred = await signInWithEmailAndPassword(auth, email, password);
          if (fbCred.user.email) {
            const res = await api.firebaseLogin({
              email: fbCred.user.email,
              name: fbCred.user.displayName || undefined,
              firebaseUid: fbCred.user.uid
            });
            login(res.token, res.user);
            showToast(`Signed in with Firebase Authentication! Welcome back, ${res.user.name}.`, 'success');
            return;
          }
        } catch (fbErr: any) {
          try {
            const res = await api.login({ email, password });
            login(res.token, res.user);
            return;
          } catch (dbErr: any) {
            setError(formatFirebaseError(fbErr));
            return;
          }
        }
      } else if (authModalMode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        // Try creating user in Firebase Auth
        try {
          const fbCred = await createUserWithEmailAndPassword(auth, email, password);
          if (fbCred.user) {
            if (name.trim()) {
              await updateProfile(fbCred.user, { displayName: name.trim() }).catch(() => {});
            }
            if (fbCred.user.email) {
              const res = await api.firebaseLogin({
                email: fbCred.user.email,
                name: name.trim(),
                firebaseUid: fbCred.user.uid
              });
              login(res.token, res.user);
              showToast('Account created with Firebase Authentication!', 'success');
              return;
            }
          }
        } catch (fbErr: any) {
          if (
            fbErr?.code === 'auth/email-already-in-use' ||
            fbErr?.code === 'auth/weak-password' ||
            fbErr?.code === 'auth/invalid-email'
          ) {
            setError(formatFirebaseError(fbErr));
            return;
          }
          try {
            const res = await api.signup({ name, email, password });
            login(res.token, res.user);
            showToast('Account created successfully! Welcome to StudySniper AI.', 'success');
            return;
          } catch (dbErr: any) {
            setError(formatFirebaseError(fbErr));
            return;
          }
        }
      } else if (authModalMode === 'verify_otp') {
        if (otpCode.length !== 6) {
          setError('Please enter the full 6-digit verification code.');
          setLoading(false);
          return;
        }
        const res = await api.verifyOtp({ email: currentEmail, otpCode, purpose: 'email_verification' });
        login(res.token, res.user);
      } else if (authModalMode === 'forgot') {
        const res = await api.forgotPassword({ email });
        setPendingEmail(email);
        if (res.demoOtp) setDemoOtp(res.demoOtp);
        setAuthModalMode('reset_password');
        setCooldown(60);
        showToast('Password reset verification code sent!', 'info');
      } else if (authModalMode === 'reset_password') {
        if (otpCode.length !== 6) {
          setError('Please enter the 6-digit verification code.');
          setLoading(false);
          return;
        }
        await api.resetPassword({
          email: currentEmail,
          otpCode,
          newPassword
        });
        showToast('Password reset successful! Please sign in with your new password.', 'success');
        setAuthModalMode('login');
        setPassword('');
        setOtpCode('');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check inputs.');
      if (err.requiresVerification && err.email) {
        setPendingEmail(err.email);
        if (err.demoOtp) setDemoOtp(err.demoOtp);
        setAuthModalMode('verify_otp');
        setCooldown(60);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (purpose: 'email_verification' | 'password_reset' = 'email_verification') => {
    if (cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      const res = await api.resendOtp({ email: currentEmail, purpose });
      if (res.demoOtp) setDemoOtp(res.demoOtp);
      setCooldown(60);
      setSuccessMsg('A new 6-digit verification code has been dispatched to your email.');
      showToast('Verification code resent successfully.', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleCopyDemoOtp = () => {
    if (!demoOtp) return;
    navigator.clipboard.writeText(demoOtp);
    setCopied(true);
    setOtpCode(demoOtp);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const randomTag = Math.floor(Math.random() * 8999 + 1000);
      const res = await api.signup({
        name: 'Alex Rivera',
        email: `student_${randomTag}@studysniper.ai`,
        password: 'PassWord123!@#'
      });
      if (res.token && res.user) {
        login(res.token, res.user);
      }
    } catch (e) {
      const fallback = await api.login({ email: 'alex@studysniper.ai', password: 'password123' }).catch(() => null);
      if (fallback?.token) {
        login(fallback.token, fallback.user);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/60 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden my-8">
        {/* Ambient Glassmorphic Background Glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base text-white flex items-center gap-1.5">
              Study Sniper AI
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Enterprise
              </span>
            </div>
            <div className="text-xs text-slate-400">Secure Active Learning SaaS</div>
          </div>
        </div>

        {/* Mode Switcher Tabs for Login/Signup */}
        {(authModalMode === 'login' || authModalMode === 'signup') && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full mb-4 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-slate-100 font-semibold text-xs flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer hover:border-purple-500/50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google (Firebase Auth)</span>
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-semibold">Or email & password</span></div>
            </div>

            <div className="flex p-1 bg-slate-950/60 rounded-2xl mb-6 border border-slate-800">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                  authModalMode === 'login'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                  authModalMode === 'signup'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>
          </>
        )}

        {/* Mode Title Headers */}
        {authModalMode === 'verify_otp' && (
          <div className="mb-5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Verify Your Email</h3>
            <p className="text-xs text-slate-400 mt-1">
              We dispatched a 6-digit verification code to{' '}
              <strong className="text-purple-300">{currentEmail}</strong>
            </p>
          </div>
        )}

        {authModalMode === 'forgot' && (
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-100">Reset Password</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter your registered email address to receive a secure 6-digit OTP reset code.
            </p>
          </div>
        )}

        {authModalMode === 'reset_password' && (
          <div className="mb-5 text-center">
            <h3 className="text-lg font-bold text-slate-100">Set New Password</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter the 6-digit OTP code sent to <strong className="text-purple-300">{currentEmail}</strong> and your new password.
            </p>
          </div>
        )}

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            {successMsg}
          </div>
        )}

        {/* OTP Mail Status Banner */}
        {(authModalMode === 'verify_otp' || authModalMode === 'reset_password') && (
          <div className="mb-4 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs space-y-2 backdrop-blur-md">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-purple-300">OTP Sent to Mail</div>
                <div className="text-[11px] text-purple-200/80 leading-snug mt-0.5">
                  A 6-digit verification code was dispatched to <strong className="text-white">{currentEmail}</strong>. Please check your inbox or spam folder.
                </div>
              </div>
            </div>

            {demoOtp && (
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-purple-500/20">
                <span className="font-mono text-base tracking-widest font-black text-purple-300 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-500/40">
                  {demoOtp}
                </span>
                <button
                  type="button"
                  onClick={handleCopyDemoOtp}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/30 hover:bg-purple-500/40 text-purple-200 text-xs font-bold border border-purple-500/50 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Auto-Filled!' : 'Auto-Fill OTP'}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/60 focus:border-purple-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none transition"
                />
              </div>
            </div>
          )}

          {(authModalMode === 'login' || authModalMode === 'signup' || authModalMode === 'forgot') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/60 focus:border-purple-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none transition"
                />
              </div>
            </div>
          )}

          {/* OTP Code Input Boxes */}
          {(authModalMode === 'verify_otp' || authModalMode === 'reset_password') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 text-center mb-1">
                Enter 6-Digit Verification Code
              </label>
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={(code) => setOtpCode(code)}
                disabled={loading}
              />
            </div>
          )}

          {/* Password Input & Password Strength Meter */}
          {(authModalMode === 'login' || authModalMode === 'signup' || authModalMode === 'reset_password') && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  {authModalMode === 'reset_password' ? 'New Password' : 'Password'}
                </label>
                {authModalMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalMode('forgot');
                      setError('');
                    }}
                    className="text-[11px] text-purple-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authModalMode === 'reset_password' ? newPassword : password}
                  onChange={e => {
                    if (authModalMode === 'reset_password') {
                      setNewPassword(e.target.value);
                    } else {
                      setPassword(e.target.value);
                    }
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700/60 focus:border-purple-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter for Signup & Reset */}
              {(authModalMode === 'signup' || authModalMode === 'reset_password') && (
                <PasswordStrengthMeter
                  password={authModalMode === 'reset_password' ? newPassword : password}
                  name={name}
                  email={currentEmail}
                />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {authModalMode === 'login' && 'Sign In to Dashboard'}
                {authModalMode === 'signup' && 'Create Account & Sign In'}
                {authModalMode === 'verify_otp' && 'Confirm Code & Access App'}
                {authModalMode === 'forgot' && 'Send 6-Digit Reset Code'}
                {authModalMode === 'reset_password' && 'Reset Password & Sign In'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Resend OTP button & timer */}
        {(authModalMode === 'verify_otp' || authModalMode === 'reset_password') && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs">
            <div className="text-slate-400 mb-2">Didn&apos;t receive the code?</div>
            <button
              type="button"
              disabled={cooldown > 0 || resending}
              onClick={() => handleResendOtp(authModalMode === 'reset_password' ? 'password_reset' : 'email_verification')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-purple-300 font-semibold disabled:opacity-50 text-xs border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Verification Code'}
            </button>
          </div>
        )}

        {/* Back navigation buttons */}
        {(authModalMode === 'forgot' || authModalMode === 'verify_otp' || authModalMode === 'reset_password') && (
          <button
            onClick={() => {
              setAuthModalMode('login');
              setError('');
              setSuccessMsg('');
            }}
            className="w-full mt-3 text-center text-xs text-slate-400 hover:text-white"
          >
            ← Back to Sign In
          </button>
        )}

        {/* Instant Demo Shortcut */}
        {(authModalMode === 'login' || authModalMode === 'signup') && (
          <>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-medium">Or instant demo</span></div>
            </div>

            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" /> Auto Instant Verified Student Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};
