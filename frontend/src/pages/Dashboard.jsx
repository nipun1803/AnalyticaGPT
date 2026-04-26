/**
 * Dashboard — Overview with Lucide icons, shadcn Cards & Badges.
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Rows3, Columns3, AlertTriangle, CheckCircle2, HardDrive, Copy, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/Skeleton';
import { getSummary, getInsights } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { Sparkles, TrendingUp } from 'lucide-react';

export default function Dashboard({ datasetInfo, summaryData, setSummaryData }) {
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    if (!summaryData && datasetInfo) {
      setLoading(true);
      Promise.all([
        getSummary().catch(() => toast.error('Failed to load summary')),
        getInsights('ceo').catch(() => toast.error('Failed to generate automatic insights'))
      ]).then(([summary, insights]) => {
        if (summary) setSummaryData(summary);
        if (insights) setAiInsights(insights.insights);
      }).finally(() => setLoading(false));
    }
  }, [datasetInfo, summaryData, setSummaryData]);

  if (!datasetInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-fade-in">
        <Database className="w-16 h-16 text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold text-zinc-700 dark:text-zinc-300">No Dataset Loaded</h2>
        <p className="text-zinc-500 text-sm mt-1">Upload a CSV file to get started</p>
      </div>
    );
  }

  const quality = summaryData?.profiling;
  const missing = Object.values(datasetInfo.missing_values || {}).reduce((a, b) => a + b, 0);

  const stats = [
    { icon: Rows3, label: 'Rows', value: datasetInfo.rows?.toLocaleString(), color: 'text-orange-400', bg: 'bg-orange-600/10' },
    { icon: Columns3, label: 'Columns', value: datasetInfo.columns, color: 'text-rose-400', bg: 'bg-rose-600/10' },
    { icon: AlertTriangle, label: 'Missing', value: missing, color: 'text-amber-400', bg: 'bg-amber-600/10' },
    { icon: CheckCircle2, label: 'Completeness', value: quality ? `${quality.completeness_pct}%` : '—', color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h2>
          <p className="text-zinc-500 text-sm mt-0.5">Analysing <span className="text-zinc-700 dark:text-zinc-300 font-medium">{datasetInfo.filename}</span></p>
        </div>
        <Badge variant="success" className="gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live</Badge>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={1} />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <Card key={label} className="hover:border-zinc-300 dark:border-zinc-700 transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Zero-Effort AI Insights Panel */}
      {loading ? (
        <SkeletonCard rows={5} />
      ) : aiInsights ? (
        <Card className="border-orange-600/30 bg-orange-600/5 dark:bg-orange-900/10 shadow-lg shadow-orange-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <Sparkles className="w-5 h-5" /> 
              Instant AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="prose-custom text-sm">
            <ReactMarkdown>{aiInsights}</ReactMarkdown>
          </CardContent>
        </Card>
      ) : null}

      {/* Quality report */}
      {quality && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-orange-400" /> Data Quality</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Memory', value: `${quality.memory_usage_mb} MB` },
                { label: 'Duplicates', value: quality.duplicate_rows },
                { label: 'Complete', value: `${quality.complete_rows} / ${quality.total_rows}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800/60">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-1">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column badges */}
      {datasetInfo.column_types && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Columns3 className="w-4 h-4 text-rose-400" /> Column Types</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(datasetInfo.column_types).map(([col, dtype]) => (
                <Badge key={col} variant={dtype.includes('int') || dtype.includes('float') ? 'info' : 'warning'}>
                  {col} <span className="opacity-50 ml-1">({dtype})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {datasetInfo.preview?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Table2Icon className="w-4 h-4 text-emerald-400" /> Preview (first 10)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>{Object.keys(datasetInfo.preview[0]).map((c) => (
                  <th key={c} className="text-left px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 font-medium">{c}</th>
                ))}</tr>
              </thead>
              <tbody>
                {datasetInfo.preview.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800/40 max-w-[180px] truncate text-xs">
                        {v !== null && v !== undefined ? String(v) : <span className="text-red-400/50 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Table2Icon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>;
}
