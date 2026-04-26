/**
 * MLPanel — ML Engine with Lucide icons, shadcn Cards, new theme.
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, Target, ShieldAlert, Play, Settings2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { getColumns, runPrediction, runClustering, runAnomalyDetection, runForecasting } from '../services/api';

const COLORS = ['#6366F1', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#A78BFA'];
const TT = {
  contentStyle: {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    color: 'var(--color-foreground)',
    fontSize: '12px',
  },
};

export default function MLPanel({ datasetInfo }) {
  const [tab, setTab] = useState('regression');
  const [cols, setCols] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [targetCol, setTargetCol] = useState('');
  const [testSize, setTestSize] = useState(0.2);
  const [nClusters, setNClusters] = useState(0);
  const [contamination, setContamination] = useState(0.05);

  useEffect(() => {
    queueMicrotask(() => {
      setResults({});
      setCols(null);
      setTargetCol('');
    });
    if (!datasetInfo) return;
    queueMicrotask(() => {
      getColumns()
        .then((c) => {
          setCols(c);
          if (c.numeric_columns?.length) setTargetCol(c.numeric_columns[0]);
        })
        .catch((err) => {
          toast.error(err.response?.data?.detail || 'Failed to load columns. Upload a dataset first.');
        });
    });
  }, [datasetInfo]);

  const run = async (fn, key, ...args) => {
    setLoading(true);
    try { const res = await fn(...args); setResults((p) => ({ ...p, [key]: res })); toast.success(`${key} complete`); }
    catch (err) { toast.error(err.response?.data?.detail || `${key} failed`); }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: 'regression', label: 'Regression', icon: TrendingUp },
    { key: 'clustering', label: 'Clustering', icon: Target },
    { key: 'anomaly', label: 'Anomalies', icon: ShieldAlert },
    { key: 'forecast', label: 'Forecasting', icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">ML Engine</h2>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">Machine learning with built-in explainability</p>
      </div>

      {!datasetInfo && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Upload a dataset first to enable regression, clustering, anomaly detection, and forecasting.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={tab === key ? 'default' : 'secondary'} size="sm" onClick={() => setTab(key)}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </Button>
        ))}
      </div>

      {/* Regression */}
      {tab === 'regression' && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="w-4 h-4 text-[color:var(--color-primary)]" /> Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-zinc-500 mb-1 block">Target Column</label>
                  <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)} disabled={!cols?.numeric_columns?.length}
                    className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[color:var(--color-primary)] disabled:opacity-60">
                    {cols?.numeric_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Test Size: {(testSize * 100).toFixed(0)}%</label>
                  <input type="range" min={0.05} max={0.5} step={0.05} value={testSize} onChange={(e) => setTestSize(+e.target.value)} className="w-full accent-[color:var(--color-primary)]" />
                </div>
              </div>
              <Button onClick={() => run(runPrediction, 'regression', targetCol, null, testSize)} loading={loading} disabled={!datasetInfo || !targetCol}>
                <Play className="w-4 h-4" /> Run Regression
              </Button>
            </CardContent>
          </Card>
          {results.regression && <RegressionResults data={results.regression} />}
        </div>
      )}

      {/* Clustering */}
      {tab === 'clustering' && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="w-4 h-4 text-[color:var(--color-secondary)]" /> Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Clusters: {nClusters === 0 ? 'Auto (Silhouette)' : nClusters}</label>
                <input type="range" min={0} max={10} step={1} value={nClusters} onChange={(e) => setNClusters(+e.target.value)} className="w-full accent-[color:var(--color-accent)]" />
              </div>
              <Button onClick={() => run(runClustering, 'clustering', nClusters || null)} loading={loading} disabled={!datasetInfo}>
                <Play className="w-4 h-4" /> Run Clustering
              </Button>
            </CardContent>
          </Card>
          {results.clustering && <ClusterResults data={results.clustering} />}
        </div>
      )}

      {/* Anomaly */}
      {tab === 'anomaly' && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="w-4 h-4 text-[color:var(--color-warning)]" /> Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Contamination: {(contamination * 100).toFixed(0)}%</label>
                <input type="range" min={0.01} max={0.5} step={0.01} value={contamination} onChange={(e) => setContamination(+e.target.value)} className="w-full accent-[color:var(--color-warning)]" />
              </div>
              <Button onClick={() => run(runAnomalyDetection, 'anomaly', contamination)} loading={loading} disabled={!datasetInfo}>
                <Play className="w-4 h-4" /> Detect Anomalies
              </Button>
            </CardContent>
          </Card>
          {results.anomaly && <AnomalyResults data={results.anomaly} />}
        </div>
      )}

      {/* Forecast */}
      {tab === 'forecast' && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="w-4 h-4 text-[color:var(--color-success)]" /> Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Date Column</label>
                  <select onChange={(e) => setCols(p => ({ ...p, _selectedDate: e.target.value }))} disabled={!cols?.all_columns?.length}
                    className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)]">
                    <option value="">Select Date Column...</option>
                    {cols?.all_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Target Column</label>
                  <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)} disabled={!cols?.numeric_columns?.length}
                    className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)]">
                    {cols?.numeric_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={() => run(runForecasting, 'forecast', cols._selectedDate, targetCol, 30)} disabled={!datasetInfo || !cols?._selectedDate || !targetCol} loading={loading}>
                <Play className="w-4 h-4" /> Run 30-Day Forecast
              </Button>
            </CardContent>
          </Card>
          {results.forecast && <ForecastResults data={results.forecast} />}
        </div>
      )}
    </div>
  );
}

function RegressionResults({ data }) {
  const imp = data.feature_importance?.slice(0, 10).map((f) => ({ name: f.feature.length > 12 ? f.feature.slice(0, 12) + '…' : f.feature, importance: f.importance }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(data.metrics).map(([k, v]) => (
          <Card key={k}><CardContent className="p-4 text-center"><p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">{k.replace(/_/g, ' ')}</p><p className="text-lg font-bold text-[var(--color-foreground)] mt-1">{typeof v === 'number' ? v.toFixed(4) : v}</p></CardContent></Card>
        ))}
      </div>
      {imp?.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Feature Importance</CardTitle></CardHeader><CardContent>
          <div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={imp} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} /><XAxis type="number" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} /><YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} width={100} /><Tooltip {...TT} /><Bar dataKey="importance" fill="var(--color-primary)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
        </CardContent></Card>
      )}
      <Card><CardHeader><CardTitle className="text-sm">Explanation</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--color-muted-foreground)]">{data.explanation}</p></CardContent></Card>
    </div>
  );
}

function ClusterResults({ data }) {
  const pie = Object.entries(data.cluster_sizes).map(([n, v]) => ({ name: n, value: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Clusters</p><p className="text-2xl font-bold text-[color:var(--color-primary)] mt-1">{data.n_clusters}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Silhouette</p><p className="text-2xl font-bold text-[color:var(--color-accent)] mt-1">{data.silhouette_score}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Features</p><p className="text-2xl font-bold text-[var(--color-foreground)] mt-1">{data.feature_columns?.length}</p></CardContent></Card>
      </div>
      <Card><CardContent className="p-6"><div className="h-60"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} cx="50%" cy="50%" outerRadius={95} innerRadius={35} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}>{pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...TT} /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card>
    </div>
  );
}

function AnomalyResults({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Anomalies</p><p className="text-2xl font-bold text-[color:var(--color-danger)] mt-1">{data.n_anomalies}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Ratio</p><p className="text-2xl font-bold text-[color:var(--color-warning)] mt-1">{(data.anomaly_ratio * 100).toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Normal</p><p className="text-2xl font-bold text-[color:var(--color-success)] mt-1">{((1 - data.anomaly_ratio) * 100).toFixed(1)}%</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">Explanation</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--color-muted-foreground)]">{data.explanation}</p></CardContent></Card>
      {data.anomaly_samples?.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Anomaly Samples</CardTitle></CardHeader><CardContent className="overflow-x-auto">
          <table className="w-full text-xs"><thead><tr>{Object.keys(data.anomaly_samples[0]).map((c) => <th key={c} className="text-left px-2 py-2 text-[var(--color-muted-foreground)] uppercase border-b border-[var(--color-border)] text-[10px]">{c}</th>)}</tr></thead>
          <tbody>{data.anomaly_samples.map((r, i) => <tr key={i} className="hover:bg-[var(--color-muted)]">{Object.values(r).map((v, j) => <td key={j} className="px-2 py-1.5 text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] max-w-[120px] truncate">{v !== null ? String(v) : '—'}</td>)}</tr>)}</tbody></table>
        </CardContent></Card>
      )}
    </div>
  );
}

function ForecastResults({ data }) {
  const chartData = [...data.historical.map(d => ({ ...d, type: 'Historical' })), ...data.forecast.map(d => ({ ...d, type: 'Forecast' }))];
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4 flex gap-4 items-center justify-between">
        <div><p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Model R² Score</p><p className="text-xl font-bold text-[color:var(--color-success)] mt-1">{data.metrics?.r2_score}</p></div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[color:var(--color-primary)]" /> <span className="text-xs text-[var(--color-muted-foreground)]">Historical</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[color:var(--color-success)]" /> <span className="text-xs text-[var(--color-muted-foreground)]">Forecast</span></div>
        </div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Forecast Projection (30 Days)</CardTitle></CardHeader><CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(val) => val.slice(5)} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(val) => val > 1000 ? (val/1000).toFixed(1)+'k' : val} />
              <Tooltip {...TT} />
              <Line type="monotone" dataKey="value" stroke={(d) => d.type === 'Forecast' ? 'var(--color-success)' : 'var(--color-primary)'} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Explanation</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--color-muted-foreground)]">{data.explanation}</p></CardContent></Card>
    </div>
  );
}
