/**
 * InsightsPanel — AI insights with Lucide, shadcn Cards, role selector.
 */

import { useEffect, useState } from 'react';
import { BarChart3, Briefcase, Crown, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { SkeletonCard } from '../components/Skeleton';
import { getInsights, getSummary } from '../services/api';

const ROLES = [
  { value: 'analyst', label: 'Data Analyst', icon: BarChart3, color: '#7c3aed', desc: 'Technical depth, statistical rigor' },
  { value: 'manager', label: 'Manager', icon: Briefcase, color: '#06b6d4', desc: 'Actionable KPIs, team implications' },
  { value: 'ceo', label: 'CEO', icon: Crown, color: '#f59e0b', desc: 'Strategic vision, ROI focus' },
];

export default function InsightsPanel() {
  const [role, setRole] = useState('analyst');
  const [insights, setInsights] = useState(null);
  const [basis, setBasis] = useState(null);
  const [loading, setLoading] = useState(false);

  const gen = async () => {
    setLoading(true); setInsights(null);
    try {
      const [r, s] = await Promise.all([getInsights(role), getSummary().catch(() => null)]);
      setInsights(r.insights);
      if (s?.statistics?.shape) setBasis(s.statistics.shape);
    } catch {
      toast.error('Failed to generate');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    // preload basis if possible
    getSummary().then((s) => s?.statistics?.shape && setBasis(s.statistics.shape)).catch(() => {});
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div><h2 className="text-2xl font-bold text-[var(--color-foreground)]">AI Insights</h2><p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">Role-tailored analysis powered by Groq LLM</p></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((r) => (
          <button key={r.value} onClick={() => setRole(r.value)}
            className={`text-left rounded-2xl p-5 border transition-all duration-200 group ${
              role === r.value ? 'border-orange-600/40 bg-orange-600/5 shadow-lg' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:border-zinc-700'
            }`} style={role === r.value ? { boxShadow: `0 0 30px ${r.color}10` } : {}}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${r.color}15` }}>
                <r.icon className="w-5 h-5" style={{ color: r.color }} />
              </div>
              <div><p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">{r.label}</p><p className="text-[10px] text-zinc-500">{r.desc}</p></div>
            </div>
            {role === r.value && <div className="h-0.5 rounded-full mt-2" style={{ background: r.color }} />}
          </button>
        ))}
      </div>

      <div className="text-center">
        <Button onClick={gen} loading={loading} size="lg"><Sparkles className="w-4 h-4" /> Generate Insights</Button>
      </div>

      {loading && <div className="space-y-3"><SkeletonCard rows={4} /><SkeletonCard rows={3} /></div>}

      {insights && (
        <Card className="animate-fade-in">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-4">
              {(() => { const R = ROLES.find(x => x.value === role); return R ? <R.icon className="w-4 h-4" style={{ color: R.color }} /> : null; })()}
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{ROLES.find(x => x.value === role)?.label} Perspective</span>
            </div>
            <div className="prose-custom text-sm"><ReactMarkdown>{insights}</ReactMarkdown></div>

            {basis && (
              <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Based on current dataset summary
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Rows: <span className="text-[var(--color-foreground)] font-medium">{basis.rows}</span>, Columns:{" "}
                  <span className="text-[var(--color-foreground)] font-medium">{basis.columns}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
