import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Database, KeyRound, User as UserIcon, Mail, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password rules validation states
  const [rules, setRules] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setRules({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*#?&_]/.test(password)
    });
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    // Check client-side password strength
    const allRulesMet = Object.values(rules).every(Boolean);
    if (!allRulesMet) {
      setError('Password does not meet all security requirements.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await register({ username, email, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 px-4">
      {/* Decorative background components */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[85px] opacity-15 pointer-events-none"></div>

      <div className="w-full max-w-lg glass rounded-3xl p-8 shadow-2xl relative z-10 border border-white/10 transition-all">
        <div className="text-center mb-6">
          <div className="inline-flex p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3">
            <Database className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Create Account</h2>
          <p className="text-slate-400 text-sm mt-1">Get started with your SQL Query Assistant</p>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/15 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>Registration successful! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john_doe"
                  className="w-full bg-slate-950/40 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-slate-950/40 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-500 text-sm transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/40 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/40 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-500 text-sm transition-all"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Password Strength Indicator list */}
          <div className="p-3 bg-slate-950/30 rounded-xl border border-white/5 space-y-1.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">Password Requirements:</span>
            <div className="flex items-center gap-2">
              {rules.length ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
              <span className={rules.length ? 'text-emerald-300' : ''}>At least 8 characters long</span>
            </div>
            <div className="flex items-center gap-2">
              {rules.upper ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
              <span className={rules.upper ? 'text-emerald-300' : ''}>One uppercase letter</span>
            </div>
            <div className="flex items-center gap-2">
              {rules.lower ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
              <span className={rules.lower ? 'text-emerald-300' : ''}>One lowercase letter</span>
            </div>
            <div className="flex items-center gap-2">
              {rules.number ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
              <span className={rules.number ? 'text-emerald-300' : ''}>One digit (0-9)</span>
            </div>
            <div className="flex items-center gap-2">
              {rules.special ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
              <span className={rules.special ? 'text-emerald-300' : ''}>One special character (@$!%*#?&amp;_)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-6"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
};
