/**
 * AIInsightCard — Reusable component that fetches and displays a contextual AI insight
 * for any analysis type (chart, ML result, EDA panel, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from './ui/Card';
import { getContextualInsight } from '../services/api';

export default function AIInsightCard({ type, data, role = 'analyst', className = '' }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchInsight = useCallback(async () => {
    if (!data || Object.keys(data).length === 0) return;
    setLoading(true);
    setError(false);
    try {
      const res = await getContextualInsight(type, data, role);
      setInsight(res.insight);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [type, data, role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchInsight();
  }, [fetchInsight]);

  if (!data || Object.keys(data).length === 0) return null;

  return (
    <Card className={`relative overflow-hidden border-[color:var(--color-primary)]/15 bg-[color:var(--color-primary)]/[0.03] ${className}`}>
      {/* Subtle gradient glow */}
      <div
        className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 opacity-30"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(34,211,238,0.2))' }}
      />
      <CardContent className="p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[color:var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-[color:var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-[color:var(--color-primary)] uppercase tracking-widest">
              AI Insight
            </p>
            {!loading && (
              <button
                onClick={fetchInsight}
                className="p-1 rounded-md hover:bg-[var(--color-muted)] transition-colors"
                title="Regenerate insight"
              >
                <RefreshCw className="w-3 h-3 text-[var(--color-muted-foreground)]" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-3 w-full rounded animate-shimmer" />
              <div className="h-3 w-4/5 rounded animate-shimmer" />
              <div className="h-3 w-3/5 rounded animate-shimmer" />
            </div>
          ) : error ? (
            <p className="text-xs text-[var(--color-muted-foreground)] italic">
              Could not generate insight. Click refresh to retry.
            </p>
          ) : insight ? (
            <div className="prose-custom text-xs leading-relaxed">
              <ReactMarkdown>{insight}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
