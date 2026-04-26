/**
 * Charts — Recharts visualizations with shadcn Cards, Lucide icons, new theme.
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { BarChart3, TrendingUp, PieChartIcon, Radar as RadarIcon, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SkeletonChart } from '../components/Skeleton';
import { getSummary } from '../services/api';

const COLORS = ['#6366F1', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#A78BFA'];
const TT = { contentStyle: { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-foreground)', fontSize: '12px' } };

export default function Charts({ summaryData, setSummaryData }) {
  const [tab, setTab] = useState('bar');

  useEffect(() => {
    if (!summaryData) {
      getSummary().then(setSummaryData).catch(() => toast.error('Failed'));
    }
  }, [summaryData, setSummaryData]);

  if (!summaryData) return <div className="space-y-6"><SkeletonChart /><SkeletonChart /></div>;

  const num = summaryData?.statistics?.numeric_summary || {};
  const cat = summaryData?.statistics?.categorical_summary || {};
  const corr = summaryData?.correlation || {};

  const barData = Object.entries(num).map(([c, s]) => ({ name: c.length > 14 ? c.slice(0, 14) + '…' : c, mean: +s.mean?.toFixed(2), std: +s.std?.toFixed(2), min: +s.min?.toFixed(2), max: +s.max?.toFixed(2) }));
  const distData = Object.entries(num).map(([c, s]) => ({ name: c.length > 12 ? c.slice(0, 12) + '…' : c, skewness: +s.skewness?.toFixed(3), kurtosis: +s.kurtosis?.toFixed(3) }));
  const pieData = Object.entries(cat).slice(0, 6).map(([c, i]) => ({ name: c, value: i.unique || 0 }));
  const firstCat = Object.entries(cat)[0];
  const catPie = firstCat ? Object.entries(firstCat[1].top_values || {}).slice(0, 8).map(([n, v]) => ({ name: n, value: v })) : [];

  const tabs = [
    { key: 'bar', label: 'Bar', icon: BarChart3 }, { key: 'line', label: 'Line', icon: TrendingUp },
    { key: 'pie', label: 'Pie', icon: PieChartIcon }, { key: 'radar', label: 'Radar', icon: RadarIcon },
    { key: 'dist', label: 'Distribution', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h2 className="text-2xl font-bold text-[var(--color-foreground)]">Visualizations</h2><p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">Interactive charts from your dataset</p></div>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={tab === key ? 'default' : 'secondary'} size="sm" onClick={() => setTab(key)}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </Button>
        ))}
      </div>
      <Card><CardContent className="p-6"><div className="h-80">
        {barData.length === 0 ? <div className="flex items-center justify-center h-full text-[var(--color-muted-foreground)] text-sm">No numeric data</div> : (
          <ResponsiveContainer width="100%" height="100%">
            {tab === 'bar' ? (
              <BarChart data={barData} margin={{ bottom: 60 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} /><XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} angle={-35} textAnchor="end" /><YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} /><Tooltip {...TT} /><Legend /><Bar dataKey="mean" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /><Bar dataKey="std" fill="var(--color-accent)" radius={[6, 6, 0, 0]} /></BarChart>
            ) : tab === 'line' ? (
              <LineChart data={barData} margin={{ bottom: 60 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} /><XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} angle={-35} textAnchor="end" /><YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} /><Tooltip {...TT} /><Legend /><Line type="monotone" dataKey="mean" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ fill: 'var(--color-primary)', r: 3 }} /><Line type="monotone" dataKey="max" stroke="var(--color-accent)" strokeWidth={2} /><Line type="monotone" dataKey="min" stroke="var(--color-danger)" strokeWidth={2} /></LineChart>
            ) : tab === 'pie' ? (
              <PieChart><Pie data={catPie.length > 0 ? catPie : pieData} cx="50%" cy="50%" outerRadius={110} innerRadius={45} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}>{(catPie.length > 0 ? catPie : pieData).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...TT} /><Legend /></PieChart>
            ) : tab === 'radar' ? (
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={barData.slice(0, 8)}><PolarGrid stroke="#27272a" /><PolarAngleAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 9 }} /><PolarRadiusAxis tick={{ fill: '#52525b', fontSize: 8 }} /><Radar name="Mean" dataKey="mean" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} /><Radar name="Std" dataKey="std" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} /><Legend /><Tooltip {...TT} /></RadarChart>
            ) : (
              <BarChart data={distData} margin={{ bottom: 60 }}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} /><XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} angle={-35} textAnchor="end" /><YAxis tick={{ fill: '#71717a', fontSize: 10 }} /><Tooltip {...TT} /><Legend /><Bar dataKey="skewness" fill="#f59e0b" radius={[6, 6, 0, 0]} /><Bar dataKey="kurtosis" fill="#ef4444" radius={[6, 6, 0, 0]} /></BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div></CardContent></Card>

      {/* Correlation matrix */}
      {corr?.columns && (
        <Card><CardHeader><CardTitle className="text-sm">Correlation Matrix</CardTitle></CardHeader><CardContent className="overflow-x-auto">
          <table className="text-[10px] w-full"><thead><tr><th className="p-1" />{corr.columns.map(c => <th key={c} className="p-1 text-zinc-500 font-normal" title={c}>{c.slice(0, 5)}</th>)}</tr></thead>
          <tbody>{corr.columns.map((r, i) => <tr key={r}><td className="p-1 text-zinc-500 font-medium">{r.slice(0, 5)}</td>{corr.values[i].map((v, j) => {
            const abs = Math.abs(v); const hue = v > 0 ? '124,58,237' : '239,68,68';
            return <td key={j} className="p-1 text-center rounded" style={{ background: `rgba(${hue},${abs * 0.4})` }} title={`${r} × ${corr.columns[j]}: ${v.toFixed(3)}`}>{v.toFixed(1)}</td>;
          })}</tr>)}</tbody></table>
        </CardContent></Card>
      )}
    </div>
  );
}
