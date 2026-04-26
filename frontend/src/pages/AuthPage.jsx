/**
 * AuthPage — Login / Register with premium dark design.
 */

import { useState } from 'react';
import { Zap, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/useAuth';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, username, password, fullName);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 mb-4 shadow-lg shadow-orange-600/25">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">InsightForge AI</h1>
          <p className="text-zinc-500 text-sm mt-1.5">RAG-Powered Data Analysis Engine</p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800/80">
          <CardContent className="p-8">
            {/* Tab toggle */}
            <div className="flex bg-white dark:bg-zinc-900 rounded-xl p-1 mb-6">
              {['login', 'register'].map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                    mode === m ? 'bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-300'
                  }`}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-2.5">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Features */}
            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-3">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>Powered by</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Groq LLM', 'ChromaDB', 'Scikit-learn', 'RAG Pipeline'].map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400">{t}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
