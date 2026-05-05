/**
 * Charts — Smart visualizations that automatically pick the best chart type
 * for each column, with proper correlation heatmap.
 */

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SkeletonChart } from '../components/Skeleton';
import { getSummary } from '../services/api';

const COLORS = ['#6366F1', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#A78BFA'];
const TT = {
  contentStyle: {
    background: 'var(--color-card)', border: '1px solid var(--color-border)',
    borderRadius: '12px', color: 'var(--color-foreground)', fontSize: '12px',
  },
};

export default function Charts({ summaryData, setSummaryData }) {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!summaryData) {
      setLoading(true);
      getSummary()
        .then(setSummaryData)
        .catch(() => toast.error('Failed to load summary'))
        .finally(() => setLoading(false));
    }
  }, [summaryData, setSummaryData]);

  if (loading || !summaryData) {
    return <div className="space-y-6"><SkeletonChart /><SkeletonChart /></div>;
  }

  const num = summaryData?.statistics?.numeric_summary || {};
  const cat = summaryData?.statistics?.categorical_summary || {};
  const corr = summaryData?.correlation || {};

  const numCols = Object.keys(num);
  const catCols = Object.keys(cat);

  // Prepare meaningful chart data
  const statsData = numCols.map((c) => ({
    name: c.length > 16 ? c.slice(0, 16) + '…' : c,
    fullName: c,
    mean: +(num[c].mean?.toFixed(2) || 0),
    std: +(num[c].std?.toFixed(2) || 0),
    min: +(num[c].min?.toFixed(2) || 0),
    max: +(num[c].max?.toFixed(2) || 0),
    skewness: +(num[c].skewness?.toFixed(3) || 0),
    kurtosis: +(num[c].kurtosis?.toFixed(3) || 0),
    range: +((num[c].max - num[c].min)?.toFixed(2) || 0),
  }));

  // First categorical distribution (for pie chart)
  const firstCatEntry = catCols.length > 0 ? { name: catCols[0], ...cat[catCols[0]] } : null;
  const catPieData = firstCatEntry
    ? Object.entries(firstCatEntry.top_values || {}).slice(0, 8).map(([n, v]) => ({ name: n, value: v }))
    : [];

  // Unique counts for all categoricals
  const catUniqueData = catCols.map((c) => ({
    name: c.length > 14 ? c.slice(0, 14) + '…' : c,
    unique: cat[c].unique || 0,
    nulls: cat[c].null_count || 0,
  }));

  // Normalize stats for radar (scale 0-100)
  const radarData = statsData.slice(0, 6).map((d) => {
    const maxMean = Math.max(...statsData.map((s) => Math.abs(s.mean))) || 1;
    const maxStd = Math.max(...statsData.map((s) => s.std)) || 1;
    const maxRange = Math.max(...statsData.map((s) => s.range)) || 1;
    return {
      name: d.name,
      'Relative Mean': +((Math.abs(d.mean) / maxMean) * 100).toFixed(0),
      'Relative Std': +((d.std / maxStd) * 100).toFixed(0),
      'Relative Range': +((d.range / maxRange) * 100).toFixed(0),
    };
  });

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'spread', label: 'Spread', icon: TrendingUp },
    { key: 'categorical', label: 'Categorical', icon: PieChartIcon },
    { key: 'shape', label: 'Shape', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Visualizations</h2>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">
          {numCols.length} numeric · {catCols.length} categorical features
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={tab === key ? 'default' : 'secondary'} size="sm" onClick={() => setTab(key)}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </Button>
        ))}
      </div>

      {/* ── OVERVIEW: Mean & Std comparison ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Feature Means & Standard Deviations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {statsData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[var(--color-muted-foreground)] text-sm">No numeric data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsData} margin={{ bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                      <Tooltip {...TT} />
                      <Legend />
                      <Bar dataKey="mean" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Mean" />
                      <Bar dataKey="std" fill="var(--color-accent)" radius={[6, 6, 0, 0]} name="Std Dev" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Radar comparison */}
          {radarData.length >= 3 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Feature Comparison (Normalized)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 9 }} />
                      <PolarRadiusAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 8 }} />
                      <Radar name="Rel. Mean" dataKey="Relative Mean" stroke="#6366F1" fill="#6366F1" fillOpacity={0.25} />
                      <Radar name="Rel. Std" dataKey="Relative Std" stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.15} />
                      <Radar name="Rel. Range" dataKey="Relative Range" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                      <Legend />
                      <Tooltip {...TT} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── SPREAD: Range, Min, Max ── */}
      {tab === 'spread' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feature Ranges (Min → Max with Mean)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statsData} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                  <Tooltip {...TT} />
                  <Legend />
                  <Line type="monotone" dataKey="max" stroke="#EF4444" strokeWidth={2} name="Max" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="mean" stroke="var(--color-primary)" strokeWidth={2.5} name="Mean" dot={{ r: 4, fill: 'var(--color-primary)' }} />
                  <Line type="monotone" dataKey="min" stroke="#22D3EE" strokeWidth={2} name="Min" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── CATEGORICAL ── */}
      {tab === 'categorical' && (
        <div className="space-y-6">
          {catPieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Distribution: {firstCatEntry?.name}
                  <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
                    ({firstCatEntry?.unique} unique values)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={catPieData} cx="50%" cy="50%" outerRadius={100} innerRadius={40}
                        paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {catPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...TT} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {catUniqueData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Categorical Feature Cardinality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catUniqueData} margin={{ bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                      <Tooltip {...TT} />
                      <Legend />
                      <Bar dataKey="unique" fill="var(--color-secondary)" radius={[6, 6, 0, 0]} name="Unique Values" />
                      <Bar dataKey="nulls" fill="var(--color-danger)" radius={[6, 6, 0, 0]} name="Null Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {catCols.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-[var(--color-muted-foreground)]">No categorical columns in this dataset.</p>
            </Card>
          )}
        </div>
      )}

      {/* ── SHAPE: Skewness & Kurtosis ── */}
      {tab === 'shape' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Skewness & Kurtosis
                <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
                  (distribution shape indicators)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                    <Tooltip {...TT} />
                    <Legend />
                    <Bar dataKey="skewness" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Skewness" />
                    <Bar dataKey="kurtosis" fill="#EF4444" radius={[6, 6, 0, 0]} name="Kurtosis" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-3">
                <strong>Skewness:</strong> 0 = symmetric, positive = right tail, negative = left tail. |skew| &gt; 1 = significantly skewed.
                <br />
                <strong>Kurtosis:</strong> 0 = normal, positive = heavy tails, negative = light tails.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Correlation Matrix ── */}
      {corr?.columns && corr.columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Correlation Matrix (Pearson)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="text-[10px] w-full">
              <thead>
                <tr>
                  <th className="p-1.5 text-left" />
                  {corr.columns.map((c) => (
                    <th key={c} className="p-1.5 text-[var(--color-muted-foreground)] font-normal" title={c}>
                      {c.length > 8 ? c.slice(0, 8) + '…' : c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corr.columns.map((r, i) => (
                  <tr key={r}>
                    <td className="p-1.5 text-[var(--color-muted-foreground)] font-medium whitespace-nowrap">
                      {r.length > 10 ? r.slice(0, 10) + '…' : r}
                    </td>
                    {corr.values[i].map((v, j) => {
                      const abs = Math.abs(v);
                      const isStrong = abs > 0.7 && i !== j;
                      const bg = i === j
                        ? 'var(--color-muted)'
                        : v > 0
                          ? `rgba(99,102,241,${abs * 0.4})`
                          : `rgba(239,68,68,${abs * 0.4})`;
                      return (
                        <td key={j} className={`p-1.5 text-center rounded ${isStrong ? 'font-bold' : ''}`}
                          style={{ background: bg }}
                          title={`${r} × ${corr.columns[j]}: ${v.toFixed(3)}`}>
                          {v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-2">
              Strong correlations (|r| &gt; 0.7) are shown in bold. Blue = positive, Red = negative.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
