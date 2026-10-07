import React from 'react';
import { Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password?: string;
  name?: string;
  email?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  name = '',
  email = ''
}) => {
  if (!password) return null;

  const minLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  // Check personal/common
  let notPersonal = true;
  if (email && email.includes('@')) {
    const emailPrefix = email.split('@')[0]?.toLowerCase();
    if (emailPrefix && emailPrefix.length >= 3 && password.toLowerCase().includes(emailPrefix)) {
      notPersonal = false;
    }
  }
  if (name) {
    const parts = name.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
    for (const p of parts) {
      if (password.toLowerCase().includes(p)) {
        notPersonal = false;
        break;
      }
    }
  }

  // Common simple checks
  const cleanPass = password.toLowerCase().replace(/[^a-z0-9]/g, '');
  const notCommon = !cleanPass.startsWith('password') && !cleanPass.startsWith('12345678') && cleanPass !== 'admin12345678';

  // Calculate score
  let score = 0;
  if (minLength) score += 25;
  if (hasUppercase) score += 15;
  if (hasLowercase) score += 15;
  if (hasNumber) score += 15;
  if (hasSpecial) score += 15;
  if (notCommon) score += 7.5;
  if (notPersonal) score += 7.5;

  score = Math.min(100, Math.round(score));

  let label: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let badgeBg = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  let barGradient = 'from-rose-500 to-red-600';

  if (score >= 90) {
    label = 'Strong';
    badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    barGradient = 'from-emerald-400 to-cyan-400';
  } else if (score >= 70) {
    label = 'Good';
    badgeBg = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    barGradient = 'from-cyan-400 to-blue-500';
  } else if (score >= 45) {
    label = 'Fair';
    badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    barGradient = 'from-amber-400 to-orange-500';
  }

  const requirements = [
    { label: 'At least 12 characters', valid: minLength },
    { label: 'Uppercase (A-Z) & Lowercase (a-z)', valid: hasUppercase && hasLowercase },
    { label: 'At least one number (0-9)', valid: hasNumber },
    { label: 'At least one special symbol (!@#$)', valid: hasSpecial },
    { label: 'Not common & not containing name/email', valid: notCommon && notPersonal }
  ];

  return (
    <div className="mt-3 p-3.5 rounded-xl bg-slate-900/60 dark:bg-slate-950/60 border border-slate-800 backdrop-blur-md space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          {score >= 90 ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : score >= 45 ? (
            <Shield className="w-4 h-4 text-cyan-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          )}
          <span>Password Strength</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeBg}`}>
          {label} ({score}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barGradient} transition-all duration-300 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {requirements.map((req, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              req.valid ? 'text-emerald-400 font-medium' : 'text-slate-500'
            }`}
          >
            {req.valid ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            )}
            <span className="truncate">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
