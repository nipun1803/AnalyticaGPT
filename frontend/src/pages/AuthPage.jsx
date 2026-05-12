/**
 * AuthPage — Login / Register with premium dark design.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
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
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20" style={{ backgroundImage: 'linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-foreground)] mb-4 shadow-lg">
            <Zap className="w-7 h-7 text-[var(--color-background)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)] tracking-tight">InsightForge AI</h1>
          <p className="text-[var(--color-muted-foreground)] text-sm mt-1.5 font-medium tracking-wide uppercase">Enterprise Data Engine</p>
        </div>

        <Card className="border-[var(--color-border)] shadow-xl shadow-black/5 bg-[var(--color-card)] backdrop-blur-md">
          <CardContent className="p-8">
            {/* Tab toggle */}
            <div className="flex bg-[var(--color-muted)] rounded-xl p-1 mb-6 border border-[var(--color-border)]">
              {['login', 'register'].map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize ${
                    mode === m ? 'bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                  }`}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--color-muted-foreground)] font-medium">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
                      <Input 
                        aria-label="Full Name"
                        placeholder="John Doe" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        className="pl-10" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--color-muted-foreground)] font-medium">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
                      <Input 
                        aria-label="Username"
                        placeholder="johndoe" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        className="pl-10" 
                        required 
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-[var(--color-muted-foreground)] font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
                  <Input 
                    aria-label="Email Address"
                    type="email" 
                    placeholder="you@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[var(--color-muted-foreground)] font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
                  <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
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
            <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] text-xs mb-3 font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-foreground)]" />
                <span>Enterprise Stack</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Groq LLM', 'ChromaDB', 'Scikit-learn', 'RAG Pipeline'].map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-md bg-[var(--color-muted)] border border-[var(--color-border)] text-[10px] text-[var(--color-muted-foreground)] font-medium">{t}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
