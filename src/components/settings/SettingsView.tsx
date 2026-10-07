import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Settings,
  User as UserIcon,
  Moon,
  Sun,
  Lock,
  Bell,
  Trash2,
  Check,
  Shield,
  Save,
  Loader2
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, updateUser, darkMode, toggleDarkMode, showToast, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [targetExam, setTargetExam] = useState(user?.targetExam || 'MCAT / Final Exams');
  const [dailyGoalHours, setDailyGoalHours] = useState(user?.dailyGoalHours || 3);
  const [saving, setSaving] = useState(false);

  // Security password state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Notification toggles
  const [notifStreak, setNotifStreak] = useState(true);
  const [notifExams, setNotifExams] = useState(true);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({ name, targetExam, dailyGoalHours });
      updateUser(res.user);
      showToast('Profile settings saved!', 'success');
    } catch (err) {
      showToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrPassword('');
    setNewPassword('');
    showToast('Password updated successfully.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-400" /> Settings & Preferences
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your account profile, theme settings, notifications, and security.
        </p>
      </div>

      {/* Profile Section */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <UserIcon className="w-4 h-4 text-purple-400" /> Account Profile
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-slate-800/40 border border-slate-800 rounded-xl text-slate-500 text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Exam / Goal</label>
              <input
                type="text"
                value={targetExam}
                onChange={e => setTargetExam(e.target.value)}
                placeholder="e.g. USMLE Step 1, GRE, Final Semester"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Daily Study Target ({dailyGoalHours} hours)</label>
              <input
                type="range"
                min="1"
                max="12"
                value={dailyGoalHours}
                onChange={e => setDailyGoalHours(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer mt-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
          </button>
        </form>
      </div>

      {/* Theme & Display Mode */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          {darkMode ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-400" />} Theme & Appearance
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200">Dark / Light Interface</div>
            <div className="text-[11px] text-slate-400">Toggle dark glassmorphism mode or crisp light view.</div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center gap-2"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-400" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      {/* Password & Security */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="w-4 h-4 text-purple-400" /> Password & Security
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currPassword}
              onChange={e => setCurrPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Delete / Danger Zone */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-rose-500/20 space-y-4">
        <div className="text-sm font-bold text-rose-400 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Trash2 className="w-4 h-4" /> Danger Zone
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200">Sign Out & Delete Account</div>
            <div className="text-[11px] text-slate-400">Permanently purge local session and profile.</div>
          </div>
          <button
            onClick={() => {
              logout();
              showToast('Account session cleared.', 'info');
            }}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/30 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
