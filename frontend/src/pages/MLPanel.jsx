/**
 * MLPanel — ML Engine: Regression · Classification · Clustering · Anomaly · Forecast
 * 
 * Changes from original:
 *  - NEW: Classification tab (Random Forest) with confusion matrix + per-class metrics
 *  - FIX: ForecastResults chart now uses two separate <Line> components (historical vs forecast)
 *  - FIX: Forecast confidence bands rendered via ComposedChart + Area
 *  - NEW: Cross-validation metrics row in regression results
 *  - NEW: Cluster profiles table
 */

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Line, ComposedChart, Area, Brush
} from 'recharts';
import {
  TrendingUp, Target, ShieldAlert, Play, Settings2, Clock,
  GitBranch, Network
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import EmptyState from '../components/EmptyState';
import ProgressLoader from '../components/ProgressLoader';
import AIInsightCard from '../components/AIInsightCard';
import {
  getColumns, runPrediction, runClustering, runAnomalyDetection,
  runForecasting, runClassification, executeSandbox
} from '../services/api';

const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a78bfa', '#f472b6'];
const TT = {
  contentStyle: {
    background: 'var(--color-card)', border: '1px solid var(--color-border)',
    borderRadius: '12px', color: 'var(--color-foreground)', fontSize: '12px',
  },
};

const MetricCard = ({ label, value, color = 'text-[var(--color-foreground)]' }) => (
  <Card>
    <CardContent className="p-4 text-center">
      <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">{label.replace(/_/g, ' ')}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>
        {typeof value === 'number' ? (value < 1 && value > -1 ? value.toFixed(4) : value.toFixed(2)) : value}
      </p>
    </CardContent>
  </Card>
);

export default function MLPanel({ datasetInfo }) {
  const [tab, setTab] = useState('regression');
  const [cols, setCols] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});

  // Regression
  const [targetCol, setTargetCol] = useState('');
  const [testSize, setTestSize] = useState(0.2);

  // Classification
  const [classTarget, setClassTarget] = useState('');
  const [nEstimators, setNEstimators] = useState(100);
  const [classTestSize, setClassTestSize] = useState(0.2);

  // Clustering
  const [nClusters, setNClusters] = useState(0);

  // Anomaly
  const [contamination, setContamination] = useState(0.05);

  // Forecast
  const [dateCol, setDateCol] = useState('');
  const [forecastTarget, setForecastTarget] = useState('');
  const [forecastPeriods, setForecastPeriods] = useState(30);

  // Sandbox
  const [sandboxScript, setSandboxScript] = useState('result = df.describe().to_dict()');


  useEffect(() => {
    getColumns()
      .then((c) => {
        setCols(c);
        if (c.numeric_columns?.length) {
          setTargetCol(c.numeric_columns[0]);
          setForecastTarget(c.numeric_columns[0]);
        }
        // Default class target to first non-numeric column (likely categorical label)
        const catTarget = c.categorical_columns?.[0] || c.all_columns?.[0] || '';
        setClassTarget(catTarget || c.numeric_columns?.[0] || '');
      })
      .catch(() => { });
  }, []);

  const run = async (fn, key, ...args) => {
    setLoading(true);
    try {
      const res = await fn(...args);
      setResults((p) => ({ ...p, [key]: res }));
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} complete`);
    } catch (err) {
      toast.error(err.response?.data?.detail || `${key} failed`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'regression', label: 'Regression', icon: TrendingUp },
    { key: 'classification', label: 'Classification', icon: GitBranch },
    { key: 'clustering', label: 'Clustering', icon: Target },
    { key: 'anomaly', label: 'Anomalies', icon: ShieldAlert },
    { key: 'forecast', label: 'Forecasting', icon: Clock },
    { key: 'sandbox', label: 'What-If Sandbox', icon: Network },
  ];

  if (!datasetInfo) return <EmptyState icon={Network} title="No Data Loaded" description="Please upload or select a dataset to use the ML Engine." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">ML Engine</h2>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">Machine learning with built-in explainability</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={tab === key ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setTab(key)}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </Button>
        ))}
      </div>

      {/* ── Regression ── */}
      {tab === 'regression' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-orange-400" /> Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Target Column</label>
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[color:var(--color-primary)]"
                  >
                    {cols?.numeric_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                    Test Size: {(testSize * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range" min={0.05} max={0.5} step={0.05} value={testSize}
                    onChange={(e) => setTestSize(+e.target.value)}
                    className="w-full accent-violet-600"
                  />
                </div>
              </div>
              <Button
                onClick={() => run(runPrediction, 'regression', targetCol, null, testSize)}
                disabled={loading || !targetCol}
              >
                <Play className="w-4 h-4" /> Run Regression
              </Button>
            </CardContent>
          </Card>
          {loading && tab === 'regression' && <ProgressLoader text="Training Regression model..." />}
          {results.regression && !loading && <RegressionResults data={results.regression} />}
          {results.regression && !loading && (
            <AIInsightCard
              type="regression"
              data={{ metrics: results.regression.metrics, target: results.regression.target, top_features: results.regression.feature_importance?.slice(0, 3) }}
            />
          )}
        </div>
      )}

      {/* ── Classification (NEW) ── */}
      {tab === 'classification' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-violet-400" /> Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Target Column (class label)</label>
                  <select
                    value={classTarget}
                    onChange={(e) => setClassTarget(e.target.value)}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[color:var(--color-primary)]"
                  >
                    {cols?.all_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                    Trees: {nEstimators}
                  </label>
                  <input
                    type="range" min={10} max={300} step={10} value={nEstimators}
                    onChange={(e) => setNEstimators(+e.target.value)}
                    className="w-full accent-violet-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                    Test Size: {(classTestSize * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range" min={0.1} max={0.4} step={0.05} value={classTestSize}
                    onChange={(e) => setClassTestSize(+e.target.value)}
                    className="w-full accent-violet-600"
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Features: all numeric columns except target. Works with both categorical and numeric targets.
              </p>
              <Button
                onClick={() => run(runClassification, 'classification', classTarget, null, classTestSize, nEstimators)}
                disabled={loading || !classTarget}
              >
                <Play className="w-4 h-4" /> Run Classification
              </Button>
            </CardContent>
          </Card>
          {loading && tab === 'classification' && <ProgressLoader text="Training Classification model..." />}
          {results.classification && !loading && <ClassificationResults data={results.classification} />}
          {results.classification && !loading && (
            <AIInsightCard
              type="classification"
              data={{ metrics: results.classification.metrics, target: results.classification.target, class_names: results.classification.class_names }}
            />
          )}
        </div>
      )}

      {/* ── Clustering ── */}
      {tab === 'clustering' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-rose-400" /> Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                  Clusters: {nClusters === 0 ? 'Auto (Silhouette)' : nClusters}
                </label>
                <input
                  type="range" min={0} max={10} step={1} value={nClusters}
                  onChange={(e) => setNClusters(+e.target.value)}
                  className="w-full accent-cyan-500"
                />
              </div>
              <Button
                onClick={() => run(runClustering, 'clustering', nClusters || null)}
                disabled={loading}
              >
                <Play className="w-4 h-4" /> Run Clustering
              </Button>
            </CardContent>
          </Card>
          {loading && tab === 'clustering' && <ProgressLoader text="Running Clustering algorithm..." />}
          {results.clustering && !loading && <ClusterResults data={results.clustering} />}
          {results.clustering && !loading && (
            <AIInsightCard
              type="clustering"
              data={{ n_clusters: results.clustering.n_clusters, silhouette: results.clustering.silhouette_score, sizes: results.clustering.cluster_sizes }}
            />
          )}
        </div>
      )}

      {/* ── Anomaly ── */}
      {tab === 'anomaly' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-amber-400" /> Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                  Contamination: {(contamination * 100).toFixed(0)}%
                </label>
                <input
                  type="range" min={0.01} max={0.5} step={0.01} value={contamination}
                  onChange={(e) => setContamination(+e.target.value)}
                  className="w-full accent-amber-500"
                />
              </div>
              <Button
                onClick={() => run(runAnomalyDetection, 'anomaly', contamination)}
                disabled={loading}
              >
                <Play className="w-4 h-4" /> Detect Anomalies
              </Button>
            </CardContent>
          </Card>
          {loading && tab === 'anomaly' && <ProgressLoader text="Detecting Anomalies..." />}
          {results.anomaly && !loading && <AnomalyResults data={results.anomaly} />}
          {results.anomaly && !loading && (
            <AIInsightCard
              type="anomaly"
              data={{ n_anomalies: results.anomaly.n_anomalies, ratio: results.anomaly.anomaly_ratio }}
            />
          )}
        </div>
      )}

      {/* ── Forecast ── */}
      {tab === 'forecast' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-emerald-400" /> Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Date Column</label>
                  <select
                    value={dateCol}
                    onChange={(e) => setDateCol(e.target.value)}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)]"
                  >
                    <option value="">Select date column…</option>
                    {cols?.all_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Target Column</label>
                  <select
                    value={forecastTarget}
                    onChange={(e) => setForecastTarget(e.target.value)}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)]"
                  >
                    {cols?.numeric_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                    Forecast Periods: {forecastPeriods} days
                  </label>
                  <input
                    type="range" min={7} max={365} step={7} value={forecastPeriods}
                    onChange={(e) => setForecastPeriods(+e.target.value)}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
              <Button
                onClick={() => run(runForecasting, 'forecast', dateCol, forecastTarget, forecastPeriods)}
                disabled={loading || !dateCol || !forecastTarget}
              >
                <Play className="w-4 h-4" /> Run Forecast
              </Button>
            </CardContent>
          </Card>
          {loading && tab === 'forecast' && <ProgressLoader text="Calculating Forecast..." />}
          {results.forecast && !loading && <ForecastResults data={results.forecast} periods={forecastPeriods} />}
        </div>
      )}
      {/* ── Sandbox ── */}
      {tab === 'sandbox' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-pink-400" /> Python Tool-Use Sandbox
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-zinc-500">
                Write Python code to simulate "What-If" scenarios or perform complex calculations. 
                The dataset is available as <code>df</code>. Save your final output to the <code>result</code> variable.
              </p>
              <textarea
                value={sandboxScript}
                onChange={(e) => setSandboxScript(e.target.value)}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)] font-mono focus:outline-none focus:border-[color:var(--color-primary)]"
                rows={5}
              />
              <Button
                onClick={() => run(executeSandbox, 'sandbox', sandboxScript)}
                disabled={loading || !sandboxScript.trim()}
              >
                <Play className="w-4 h-4" /> Execute Script
              </Button>
            </CardContent>
          </Card>
          {loading && tab === 'sandbox' && <ProgressLoader text="Executing Sandbox Script..." />}
          {results.sandbox && !loading && (
             <Card>
               <CardHeader><CardTitle className="text-sm">Execution Output</CardTitle></CardHeader>
               <CardContent>
                 <pre className="text-xs font-mono bg-zinc-900/50 p-4 rounded-xl text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                   {typeof results.sandbox.result === 'object' ? JSON.stringify(results.sandbox.result, null, 2) : results.sandbox.result}
                 </pre>
               </CardContent>
             </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Result Components ───────────────────────────────────────────

function RegressionResults({ data }) {
  const imp = data.feature_importance?.slice(0, 10).map((f) => ({
    name: f.feature.length > 14 ? f.feature.slice(0, 14) + '…' : f.feature,
    importance: f.importance,
    coefficient: f.coefficient,
  }));

  return (
    <div className="space-y-4">
      {/* Primary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="R² Score" value={data.metrics.r2_score}
          color={data.metrics.r2_score > 0.8 ? 'text-emerald-400' : data.metrics.r2_score > 0.5 ? 'text-amber-400' : 'text-red-400'} />
        <MetricCard label="RMSE" value={data.metrics.rmse} />
        <MetricCard label="MAE" value={data.metrics.mae} />
        <MetricCard label="Test Samples" value={data.metrics.test_samples} />
      </div>

      {/* Cross-validation row */}
      {data.metrics.cv_r2_mean !== undefined && (
        <Card>
          <CardContent className="p-4 flex items-center gap-6">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">CV R² Mean</p>
              <p className="text-lg font-bold text-blue-400 mt-1">{data.metrics.cv_r2_mean}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">CV R² Std Dev</p>
              <p className="text-lg font-bold text-zinc-400 mt-1">±{data.metrics.cv_r2_std}</p>
            </div>
            <p className="text-xs text-zinc-500 ml-auto max-w-xs">
              5-fold cross-validation score — measures how well the model generalises to unseen data.
            </p>
          </CardContent>
        </Card>
      )}

      {imp?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Feature Importance (Random Forest)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={imp} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                  <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={110} />
                  <Tooltip {...TT} />
                  <Bar dataKey="importance" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Explanation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)]">{data.explanation}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ClassificationResults({ data }) {
  const imp = data.feature_importance?.slice(0, 10).map((f) => ({
    name: f.feature.length > 14 ? f.feature.slice(0, 14) + '…' : f.feature,
    importance: f.importance,
  }));

  const cm = data.confusion_matrix;
  const classes = cm?.labels || [];
  const matrix = cm?.matrix || [];

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Accuracy" value={(data.metrics.accuracy * 100).toFixed(1) + '%'}
          color={data.metrics.accuracy > 0.9 ? 'text-emerald-400' : data.metrics.accuracy > 0.75 ? 'text-amber-400' : 'text-red-400'} />
        <MetricCard label="F1 Score" value={data.metrics.f1_score}
          color={data.metrics.f1_score > 0.85 ? 'text-emerald-400' : 'text-amber-400'} />
        <MetricCard label="Precision" value={data.metrics.precision} />
        <MetricCard label="Recall" value={data.metrics.recall} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Feature Importance */}
        {imp?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Feature Importance</CardTitle></CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={imp} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={110} />
                    <Tooltip {...TT} />
                    <Bar dataKey="importance" fill="#a78bfa" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Per-class metrics */}
        {data.per_class_metrics && Object.keys(data.per_class_metrics).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Per-Class Results</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto max-h-[400px] overflow-y-auto p-0">
              <table className="w-full text-xs relative">
                <thead className="sticky top-0 z-10 bg-white dark:bg-black shadow-sm">
                  <tr>
                    <th className="text-left px-4 py-3 text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800 text-[10px] bg-white dark:bg-black">Class</th>
                    <th className="text-left px-4 py-3 text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800 text-[10px] bg-white dark:bg-black">Support</th>
                    <th className="text-left px-4 py-3 text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800 text-[10px] bg-white dark:bg-black">Correct</th>
                    <th className="text-left px-4 py-3 text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800 text-[10px] bg-white dark:bg-black">Acc</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.per_class_metrics).map(([cls, m]) => (
                    <tr key={cls} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/40">
                      <td className="px-2 py-1.5 text-[var(--color-foreground)] border-b border-[var(--color-border)]/40 font-medium">{cls}</td>
                      <td className="px-2 py-1.5 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/40">{m.support}</td>
                      <td className="px-2 py-1.5 text-emerald-500 border-b border-zinc-100 dark:border-zinc-800/40">{m.correct}</td>
                      <td className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800/40">
                        <Badge variant={m.correct / m.support > 0.8 ? 'success' : 'warning'}>
                          {m.support > 0 ? ((m.correct / m.support) * 100).toFixed(0) + '%' : '—'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confusion Matrix */}
      {matrix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Confusion Matrix</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto max-h-[400px] overflow-y-auto p-0">
            <table className="text-xs mx-auto relative w-full">
              <thead className="sticky top-0 z-10 bg-white dark:bg-black shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-zinc-500 text-[10px] border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-left">Actual ↓ / Pred →</th>
                  {classes.map((c) => (
                    <th key={c} className="px-4 py-3 text-violet-400 text-[10px] font-semibold border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-violet-400 font-semibold text-[10px]">{classes[i]}</td>
                    {row.map((val, j) => (
                      <td
                        key={j}
                        className={`px-3 py-2 text-center font-mono rounded ${i === j
                            ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                            : val > 0
                              ? 'bg-red-500/10 text-red-400'
                              : 'text-zinc-600'
                          }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-zinc-600 mt-3 text-center">
              Green diagonal = correct predictions · Red off-diagonal = misclassifications
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Explanation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)]">{data.explanation}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ClusterResults({ data }) {
  const pie = Object.entries(data.cluster_sizes).map(([n, v]) => ({ name: n, value: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Clusters" value={data.n_clusters} color="text-orange-400" />
        <MetricCard label="Silhouette" value={data.silhouette_score} color="text-rose-400" />
        <MetricCard label="Features" value={data.feature_columns?.length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pie} cx="50%" cy="50%" outerRadius={90} innerRadius={30}
                    paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...TT} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cluster profiles table */}
        {data.cluster_profiles && Object.keys(data.cluster_profiles).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Cluster Profiles (Feature Means)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto max-h-[400px] overflow-y-auto p-0">
              <table className="w-full text-xs relative">
                <thead className="sticky top-0 z-10 bg-white dark:bg-black shadow-sm">
                  <tr>
                    <th className="text-left px-4 py-3 text-zinc-500 uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">Cluster</th>
                    {data.feature_columns?.slice(0, 4).map((f) => (
                      <th key={f} className="text-left px-4 py-3 text-zinc-500 uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black truncate max-w-[80px]">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.cluster_profiles).map(([cluster, vals], i) => (
                    <tr key={cluster} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/30">
                      <td className="px-2 py-1.5 font-semibold border-b border-zinc-100 dark:border-zinc-800/40"
                        style={{ color: COLORS[i % COLORS.length] }}>{cluster}</td>
                      {data.feature_columns?.slice(0, 4).map((f) => (
                        <td key={f} className="px-2 py-1.5 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/40 font-mono">
                          {vals[f] !== undefined ? vals[f] : '—'}
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
    </div>
  );
}

function AnomalyResults({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Anomalies" value={data.n_anomalies} color="text-red-400" />
        <MetricCard label="Ratio" value={(data.anomaly_ratio * 100).toFixed(1) + '%'} color="text-amber-400" />
        <MetricCard label="Normal" value={((1 - data.anomaly_ratio) * 100).toFixed(1) + '%'} color="text-emerald-400" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Explanation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)]">{data.explanation}</p>
        </CardContent>
      </Card>
      {data.anomaly_samples?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Anomaly Samples</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto max-h-[400px] overflow-y-auto p-0">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-10 bg-white dark:bg-black shadow-sm">
                <tr>
                  {Object.keys(data.anomaly_samples[0]).map((c) => (
                    <th key={c} className="text-left px-4 py-3 text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-[10px]">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.anomaly_samples.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/40">
                    {Object.values(r).map((v, j) => (
                      <td key={j} className="px-2 py-1.5 text-[var(--color-muted-foreground)] border-b border-zinc-200 dark:border-zinc-800/40 max-w-[120px] truncate">
                        {v !== null ? String(v) : '—'}
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

/**
 * ForecastResults — FIXED: uses two separate <Line>s + confidence interval shading.
 * Original bug: `stroke={(d) => ...}` is not a valid Recharts prop on <Line>.
 */
function ForecastResults({ data, periods }) {
  const historical = (data.historical || []).map((d) => ({ ...d, series: 'historical' }));
  const forecast = (data.forecast || []).map((d) => ({ ...d, series: 'forecast' }));

  // Recharts needs a single flat array; use null to leave gaps in opposite series
  const combined = [
    ...historical.map((d) => ({
      date: d.date,
      historical: d.value,
      forecast: null,
      upper: null,
      lower: null,
    })),
    ...forecast.map((d) => ({
      date: d.date,
      historical: null,
      forecast: d.value,
      upper: d.upper ?? null,
      lower: d.lower ?? null,
    })),
  ];

  const hasCI = forecast.some((d) => d.upper !== null);

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Train R²" value={data.metrics?.r2_score} color="text-emerald-400" />
        {data.metrics?.residual_std !== undefined && (
          <MetricCard label="Residual Std" value={data.metrics.residual_std} color="text-amber-400" />
        )}
        {hasCI && (
          <MetricCard label="95% CI Width" value={data.metrics?.confidence_95_width} color="text-blue-400" />
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 items-center px-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-xs text-zinc-500">Historical</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-500">Forecast</span>
        </div>
        {hasCI && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500/30" />
            <span className="text-xs text-zinc-500">95% Confidence Interval</span>
          </div>
        )}
      </div>

      {/* Chart — ComposedChart so we can mix Line + Area for CI bands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {periods}-Day Forecast Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combined} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={10}
                  tickFormatter={(val) => val?.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={10}
                  tickFormatter={(v) => (v > 1000 ? (v / 1000).toFixed(1) + 'k' : v)}
                />
                <Tooltip {...TT} formatter={(v, name) => [v !== null ? v : '—', name]} />

                {/* Confidence interval shading — must come before lines to render underneath */}
                {hasCI && (
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="#10b981"
                    fillOpacity={0.12}
                    connectNulls={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}
                {hasCI && (
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="#18181b"
                    fillOpacity={1}
                    connectNulls={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  name="Historical"
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  connectNulls={false}
                  name="Forecast"
                />
                <Brush dataKey="date" height={30} stroke="#444" fill="transparent" tickFormatter={(val) => val?.slice(5)} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Explanation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)]">{data.explanation}</p>
        </CardContent>
      </Card>
    </div>
  );
}