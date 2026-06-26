import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, LogOut, User as UserIcon, Settings, Shield, Edit2, Check, X, Database } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, updateUsername } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    setEditError(null);
    setEditSuccess(false);
    try {
      await updateUsername(newUsername);
      setEditSuccess(true);
      setIsEditingUsername(false);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err: any) {
      setEditError(err.response?.data?.detail || 'Failed to update username.');
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'developer':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    }
  };

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 glass px-6 flex items-center justify-between z-30 relative transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-lg bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            SQL Query Assistant
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">v1.0</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-slate-700 dark:text-slate-200"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {user?.username?.substring(0, 2)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold max-w-[80px] truncate">{user?.username}</div>
              <span className={`text-[9px] uppercase font-bold px-1 rounded-sm ${getRoleColor(user?.role)}`}>
                {user?.role}
              </span>
            </div>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-4 z-50 text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm uppercase">
                    {user?.username?.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditingUsername ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-800 text-xs px-2 py-1 rounded-md text-white border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500 w-32"
                          autoFocus
                        />
                        <button onClick={handleUpdateUsername} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-md">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setIsEditingUsername(false); setNewUsername(user?.username || ''); }} className="p-1 text-red-500 hover:bg-red-500/10 rounded-md">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-sm truncate">{user?.username}</h4>
                        <button onClick={() => setIsEditingUsername(true)} className="text-slate-400 hover:text-indigo-400 p-0.5 rounded">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>

                {editError && (
                  <p className="text-[10px] text-red-400 mt-2 bg-red-500/10 p-2 rounded-lg border border-red-500/10">{editError}</p>
                )}
                {editSuccess && (
                  <p className="text-[10px] text-emerald-400 mt-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/10">Username updated!</p>
                )}

                <div className="mt-3 py-1 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl">
                    <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Role</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getRoleColor(user?.role)}`}>
                      {user?.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full mt-3 flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 transition-all active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
