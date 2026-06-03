/**
 * EDAPanel — Intelligent Exploratory Data Analysis
 * Each chart has proper titles, axis labels, legends, and business insight cards.
 */

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import { Loader2, Info, FlaskConical, ChevronDown, ChevronUp, AlertCircle, Lightbulb, Network, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/EmptyState';
import { toast } from 'sonner';
import { getEDA, getColumns, runStatTest, getSummary } from '../services/api';
import AIInsightCard from '../components/AIInsightCard';

const TT = {
  contentStyle: {
    backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)',
    borderRadius: '8px', color: 'var(--color-foreground)', fontSize: '12px',
  },
};

const TEST_TYPES = [
  { value: 'auto', label: 'Auto-detect', desc: 'Let the system pick based on column types' },
  { value: 't_test', label: "Welch's T-test", desc: 'Compare means of two numeric columns' },
  { value: 'mannwhitney', label: 'Mann-Whitney U', desc: 'Non-parametric comparison (no normality needed)' },
  { value: 'chi_squared', label: 'Chi-squared', desc: 'Association between two categorical columns' },
  { value: 'anova', label: 'One-way ANOVA', desc: 'Numeric vs. categorical group column' },
];

/* ── Insight Card Component ─────────────────────────────── */
function ChartInsightCard({ title, description, insights = [], recommendations = [] }) {
  return (
    <div className="border-l-4 border-l-[color:var(--color-primary)] bg-[color:var(--color-primary)]/[0.03] rounded-xl p-4 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-[color:var(--color-primary)] mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[10px] font-bold text-[color:var(--color-primary)] uppercase tracking-widest mb-1">
            Insight — {title}
          </p>
          <p className="text-xs text-[var(--color-foreground)] leading-relaxed">{description}</p>
        </div>
      </div>
      {insights.length > 0 && (
        <div className="pl-6">
          <ul className="space-y-0.5">
            {insights.map((ins, i) => (
              <li key={i} className="text-[11px] text-[var(--color-muted-foreground)] flex items-start gap-1.5">
                <span className="text-[color:var(--color-primary)] font-bold">→</span> {ins}
              </li>
            ))}
          </ul>
        </div>
      )}
      {recommendations.length > 0 && (
        <div className="pl-6">
          <p className="text-[10px] font-bold text-[color:var(--color-success)] uppercase tracking-widest mb-0.5">Recommendations</p>
          <ul className="space-y-0.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-[11px] text-[var(--color-muted-foreground)] flex items-start gap-1.5">
                <span className="text-[color:var(--color-success)] font-bold">✓</span> {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function EDAPanel() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cols, setCols] = useState(null);
  const [tab, setTab] = useState('univariate');

  // Stat test state
  const [col1, setCol1] = useState('');
  const [col2, setCol2] = useState('');
  const [testType, setTestType] = useState('auto');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    Promise.all([getEDA(), getColumns(), getSummary()])
      .then(([eda, c, sum]) => {
        setData(eda);
        setCols(c);
        setSummary(sum);
        if (c.all_columns?.length >= 2) {
          setCol1(c.all_columns[0]);
          setCol2(c.all_columns[1]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStatTest = async () => {
    if (!col1 || !col2) return;
    if (col1 === col2) { toast.error('Please select two different columns'); return; }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await runStatTest(col1, col2, testType);
      setTestResult(res);
      toast.success('Statistical test complete');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Statistical test failed');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[color:var(--color-primary)] animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const numericDists = Object.entries(data.distributions).filter(([, d]) => d.type === 'numeric');
  const categoricalDists = Object.entries(data.distributions).filter(([, d]) => d.type === 'categorical');

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Exploratory Data Analysis</h2>
        <p className="text-[var(--color-muted-foreground)] text-sm">
          Intelligent feature distributions, hypothesis testing, and business insights
        </p>
      </div>

      {/* Insights about filtered columns */}
      {data.insights?.length > 0 && (
        <Card className="bg-[color:var(--color-primary)]/5 border-[color:var(--color-primary)]/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[color:var(--color-primary)] mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--color-foreground)]">Analysis Notes</p>
              {data.insights.map((insight, i) => (
                <p key={i} className="text-xs text-[var(--color-muted-foreground)]">{insight}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs for Analysis Categories ── */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === 'univariate' ? 'default' : 'secondary'} size="sm" onClick={() => setTab('univariate')}>
          <BarChart3 className="w-3.5 h-3.5 mr-2" /> Univariate Analysis
        </Button>
        <Button variant={tab === 'bivariate' ? 'default' : 'secondary'} size="sm" onClick={() => setTab('bivariate')}>
          <FlaskConical className="w-3.5 h-3.5 mr-2" /> Bivariate Analysis
        </Button>
        <Button variant={tab === 'multivariate' ? 'default' : 'secondary'} size="sm" onClick={() => setTab('multivariate')}>
          <Network className="w-3.5 h-3.5 mr-2" /> Multivariate Analysis
        </Button>
      </div>

      {/* ── Bivariate Analysis: Statistical Tests ── */}
      {tab === 'bivariate' && (
      <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 bg-[var(--color-card)] hover:bg-[var(--color-muted)] transition-colors"
          onClick={() => setStatsOpen((p) => !p)}
        >
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-[color:var(--color-secondary)]" />
            <div className="text-left">
              <p className="font-semibold text-[var(--color-foreground)] text-sm">Statistical Hypothesis Tests</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">T-test · Mann-Whitney U · Chi-squared · ANOVA</p>
            </div>
          </div>
          {statsOpen ? <ChevronUp className="w-4 h-4 text-[var(--color-muted-foreground)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-muted-foreground)]" />}
        </button>

        {statsOpen && (
          <div className="px-6 pb-6 pt-4 space-y-4 border-t border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Column 1</label>
                <select value={col1} onChange={(e) => setCol1(e.target.value)}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[color:var(--color-primary)]">
                  {cols?.all_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Column 2</label>
                <select value={col2} onChange={(e) => setCol2(e.target.value)}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[color:var(--color-primary)]">
                  {cols?.all_columns?.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Test Type</label>
                <select value={testType} onChange={(e) => setTestType(e.target.value)}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[color:var(--color-primary)]">
                  {TEST_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-[var(--color-muted-foreground)]">
              {TEST_TYPES.find((t) => t.value === testType)?.desc}
            </p>

            <Button onClick={handleStatTest} disabled={testLoading || !col1 || !col2} variant="default" size="sm">
              <FlaskConical className="w-3.5 h-3.5" />
              {testLoading ? 'Running test…' : 'Run Statistical Test'}
            </Button>

            {testResult && <StatTestResult result={testResult} />}
          </div>
        )}
      </div>
      )}

      {/* ── Multivariate Analysis: Correlation Heatmap ── */}
      {tab === 'multivariate' && summary?.correlation && Object.keys(summary.correlation).length >= 2 && (
        <Card className="border-[color:var(--color-border)] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-[color:var(--color-primary)]" />
              Multivariate Analysis: Correlation Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-4">
              <div className="inline-flex flex-col min-w-full">
                <div className="flex">
                  <div className="w-32 shrink-0"></div>
                  {Object.keys(summary.correlation).map((col) => (
                    <div key={col} className="w-16 shrink-0 text-center text-[10px] text-[var(--color-muted-foreground)] font-medium uppercase truncate px-1" title={col}>
                      {col.substring(0, 8)}
                    </div>
                  ))}
                </div>
                {Object.entries(summary.correlation).map(([rowCol, values]) => (
                  <div key={rowCol} className="flex border-t border-[var(--color-border)]">
                    <div className="w-32 shrink-0 pr-3 py-2 text-[10px] text-[var(--color-foreground)] font-medium uppercase truncate text-right flex items-center justify-end border-r border-[var(--color-border)]" title={rowCol}>
                      {rowCol}
                    </div>
                    {Object.keys(summary.correlation).map((col) => {
                      const val = values[col] || 0;
                      // Calculate color: positive = blue, negative = red
                      const isPositive = val >= 0;
                      const intensity = Math.abs(val);
                      
                      // Using primary/danger colors with opacity based on correlation strength
                      const bgClass = isPositive 
                        ? `rgba(99, 102, 241, ${intensity * 0.8 + 0.1})` 
                        : `rgba(239, 68, 68, ${intensity * 0.8 + 0.1})`;
                        
                      const textClass = intensity > 0.5 ? 'text-white font-bold' : 'text-[var(--color-foreground)]';

                      return (
                        <div 
                          key={col} 
                          className={`w-16 shrink-0 py-2 text-center text-[10px] flex items-center justify-center transition-opacity hover:opacity-80 cursor-default ${textClass}`}
                          style={{ backgroundColor: rowCol === col ? 'var(--color-card)' : bgClass }}
                          title={`${rowCol} vs ${col}: ${val.toFixed(3)}`}
                        >
                          {rowCol === col ? '-' : val.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            <ChartInsightCard 
              title="Correlation Matrix"
              description="This heatmap displays pairwise Pearson correlation coefficients between numeric variables. Values close to 1 (blue) indicate strong positive correlation, while values close to -1 (red) indicate strong negative correlation."
              insights={
                (() => {
                  const strongCorrs = [];
                  const keys = Object.keys(summary.correlation);
                  for (let i = 0; i < keys.length; i++) {
                    for (let j = i + 1; j < keys.length; j++) {
                      const val = summary.correlation[keys[i]][keys[j]];
                      if (Math.abs(val) > 0.7) {
                        strongCorrs.push(`${keys[i]} & ${keys[j]} (${val > 0 ? 'positive' : 'negative'}, r=${val.toFixed(2)})`);
                      }
                    }
                  }
                  if (strongCorrs.length > 0) {
                    return [
                      `Found ${strongCorrs.length} strong relationships (|r| > 0.7)`,
                      ...strongCorrs.slice(0, 3).map(c => `Strong link: ${c}`),
                      strongCorrs.length > 3 ? `...and ${strongCorrs.length - 3} more` : null
                    ].filter(Boolean);
                  }
                  return ["No strong linear correlations (|r| > 0.7) found among numeric variables."];
                })()
              }
              recommendations={[
                "Highly correlated features (r > 0.8) may cause multicollinearity in linear models. Consider removing one or using PCA.",
                "Features strongly correlated with your target variable are excellent candidates for predictive modeling."
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Numeric Distributions ── */}
      {tab === 'univariate' && numericDists.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-[var(--color-foreground)]">
            Numeric Distributions
            <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
              ({numericDists.length} features)
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {numericDists.map(([col, dist]) => (
              <div key={col} className="space-y-3">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-[var(--color-foreground)]">{col}</h4>
                      <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-widest">Histogram — Frequency Distribution</p>
                    </div>
                    {dist.stats && (
                      <div className="text-right">
                        <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Mean / Median</p>
                        <p className="font-mono text-xs text-[color:var(--color-primary)]">
                          {dist.stats.mean} / {dist.stats.median}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={dist.counts.map((c, i) => ({
                        count: c,
                        bin: dist.bins[i]?.toFixed?.(2) ?? String(dist.bins[i]),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis
                          dataKey="bin" stroke="var(--color-muted-foreground)" fontSize={9}
                          tickLine={false} axisLine={false}
                          label={{ value: 'Value Range (bins)', position: 'insideBottom', offset: -5, fontSize: 9, fill: 'var(--color-muted-foreground)' }}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)" fontSize={9}
                          tickLine={false} axisLine={false}
                          label={{ value: 'Frequency', angle: -90, position: 'insideLeft', offset: 10, fontSize: 9, fill: 'var(--color-muted-foreground)' }}
                        />
                        <Tooltip {...TT} formatter={(v) => [v, 'Count']} />
                        <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} opacity={0.85} name="Record Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {dist.stats && (
                    <div className="mt-3 flex gap-3 text-[10px] text-[var(--color-muted-foreground)]">
                      <span>σ = {dist.stats.std}</span>
                      <span>Skew = {dist.stats.skewness}</span>
                      {Math.abs(dist.stats.skewness) > 1 && (
                        <Badge variant="warning" className="text-[9px] py-0">Skewed</Badge>
                      )}
                    </div>
                  )}
                </Card>

                {/* Insight below each numeric chart */}
                <ChartInsightCard
                  title={col}
                  description={
                    dist.stats
                      ? `${col} has a mean of ${dist.stats.mean} and median of ${dist.stats.median}. ${Math.abs(dist.stats.skewness) > 1 ? `The distribution is significantly skewed (${dist.stats.skewness > 0 ? 'right' : 'left'}-skewed), indicating the ${dist.stats.skewness > 0 ? 'presence of high-value outliers' : 'concentration of values at the upper end'}.` : 'The distribution is approximately symmetric.'}`
                      : `Distribution analysis for ${col}.`
                  }
                  insights={[
                    dist.stats ? `Standard deviation: ${dist.stats.std} — ${dist.stats.std > dist.stats.mean * 0.5 ? 'high variability relative to mean' : 'moderate variability'}` : 'Statistics unavailable',
                    dist.stats && Math.abs(dist.stats.mean - dist.stats.median) > dist.stats.std * 0.3 ? 'Mean-median gap suggests distribution is not centered — investigate outlier impact' : 'Mean and median are close — distribution is well-centered',
                  ]}
                  recommendations={
                    dist.stats && Math.abs(dist.stats.skewness) > 1
                      ? ['Consider log transformation to normalize this feature before regression']
                      : ['Feature is well-distributed and ready for direct modeling']
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Categorical Distributions ── */}
      {tab === 'univariate' && categoricalDists.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-[var(--color-foreground)]">
            Categorical Distributions
            <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
              ({categoricalDists.length} features)
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categoricalDists.map(([col, dist]) => {
              const topLabel = dist.labels?.[0] || 'N/A';
              const topVal = dist.values?.[0] || 0;
              const totalVal = dist.values?.reduce((a, b) => a + b, 0) || 1;
              const topPct = ((topVal / totalVal) * 100).toFixed(1);
              const isDominated = topPct > 60;

              return (
                <div key={col} className="space-y-3">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-[var(--color-foreground)]">{col}</h4>
                        <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-widest">
                          Top Values — Frequency Count
                        </p>
                      </div>
                      {data.cardinality[col] && (
                        <div className="text-right">
                          <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase">Unique</p>
                          <p className="font-mono text-xs text-[color:var(--color-accent)]">{data.cardinality[col]}</p>
                        </div>
                      )}
                    </div>

                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart
                          layout="vertical"
                          data={dist.labels.map((l, i) => ({ label: String(l), value: dist.values[i] }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 9 }}
                            label={{ value: 'Frequency Count', position: 'insideBottom', offset: -5, fontSize: 9, fill: 'var(--color-muted-foreground)' }}
                          />
                          <YAxis
                            dataKey="label" type="category"
                            stroke="var(--color-muted-foreground)" fontSize={9} width={90}
                            tickLine={false} axisLine={false}
                            tickFormatter={(v) => v.length > 14 ? v.slice(0, 14) + '…' : v}
                          />
                          <Tooltip {...TT} formatter={(v) => [v, 'Count']} />
                          <Bar dataKey="value" fill="var(--color-accent)" radius={[0, 4, 4, 0]} opacity={0.75} name="Record Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <ChartInsightCard
                    title={col}
                    description={`Most frequent value is "${topLabel}" (${topPct}% of records). ${isDominated ? 'This feature is dominated by a single category, which may reduce its predictive power.' : 'Values are reasonably distributed across categories.'}`}
                    insights={[
                      `${data.cardinality[col] || dist.labels.length} unique categories detected`,
                      isDominated ? '⚠ Class imbalance detected — may need oversampling for classification tasks' : '✓ No severe class imbalance',
                    ]}
                    recommendations={
                      isDominated
                        ? ['Consider grouping rare categories into an "Other" bucket for cleaner modeling']
                        : ['Feature is well-distributed for encoding and modeling']
                    }
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'univariate' && numericDists.length === 0 && categoricalDists.length === 0 && (
        <EmptyState icon={FlaskConical} title="No Distributions" description="We could not generate meaningful distributions for this dataset." />
      )}

      {/* AI Insight on numeric distributions */}
      {numericDists.length > 0 && (
        <AIInsightCard
          type="eda_numeric"
          data={{
            features: numericDists.slice(0, 6).map(([col, d]) => ({
              column: col,
              mean: d.stats?.mean,
              median: d.stats?.median,
              std: d.stats?.std,
              skewness: d.stats?.skewness,
            })),
          }}
        />
      )}

      <Card className="p-4 bg-[color:var(--color-primary)]/5 border-[color:var(--color-primary)]/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-[color:var(--color-primary)] mt-0.5" />
        <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          Only analytically meaningful columns are shown. ID columns, constants, and high-cardinality text columns are
          automatically filtered out. Use the Statistical Tests section to test specific hypotheses.
        </p>
      </Card>
    </div>
  );
}

function StatTestResult({ result }) {
  const sig = result.significant;
  const testLabels = {
    t_test: "Welch's T-test", mannwhitney: 'Mann-Whitney U-test',
    chi_squared: 'Chi-squared Test', anova: 'One-way ANOVA',
  };

  const effectKey = Object.keys(result).find(
    (k) => k.startsWith('effect_size') && result[k] !== null && result[k] !== undefined
  );
  const effectLabel = effectKey?.replace('effect_size_', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className={`px-4 py-3 flex items-center justify-between ${sig ? 'bg-[color:var(--color-success)]/10 border-b border-[color:var(--color-success)]/20' : 'bg-[var(--color-muted)] border-b border-[var(--color-border)]'}`}>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-[var(--color-foreground)]">{testLabels[result.test_type] || result.test_type}</p>
            <span className="text-[var(--color-muted-foreground)] text-sm">·</span>
            <code className="text-xs text-[color:var(--color-primary)]">{result.col1}</code>
            <span className="text-[var(--color-muted-foreground)] text-xs">vs</span>
            <code className="text-xs text-[color:var(--color-primary)]">{result.col2}</code>
          </div>
          <Badge variant={sig ? 'success' : 'secondary'}>{sig ? '✓ Significant' : 'Not Significant'}</Badge>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">Test Statistic</p>
            <p className="text-base font-bold text-[var(--color-foreground)] mt-1 font-mono">{result.statistic?.toFixed(4)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">p-value</p>
            <p className={`text-base font-bold mt-1 font-mono ${sig ? 'text-[color:var(--color-success)]' : 'text-[var(--color-muted-foreground)]'}`}>
              {result.p_value < 0.0001 ? '< 0.0001' : result.p_value?.toFixed(4)}
            </p>
          </div>
          {effectKey && result[effectKey] !== undefined && (
            <div className="text-center">
              <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">{effectLabel}</p>
              <p className="text-base font-bold text-[color:var(--color-secondary)] mt-1 font-mono">{result[effectKey]?.toFixed(4)}</p>
            </div>
          )}
          {result.degrees_of_freedom !== undefined && (
            <div className="text-center">
              <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">Degrees of Freedom</p>
              <p className="text-base font-bold text-[var(--color-muted-foreground)] mt-1 font-mono">{result.degrees_of_freedom}</p>
            </div>
          )}
        </div>

        {result.group_means && (
          <div className="px-4 pb-4">
            <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase mb-2">Group Means ({result.numeric_column})</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.group_means).map(([grp, mean]) => (
                <span key={grp} className="text-xs bg-[var(--color-muted)] rounded-lg px-2.5 py-1 font-mono">
                  <span className="text-[var(--color-muted-foreground)]">{grp}: </span>
                  <span className="text-[var(--color-foreground)]">{mean}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {result.mean_col1 !== undefined && (
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            <div className="bg-[var(--color-muted)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--color-muted-foreground)] mb-1 uppercase">{result.col1}</p>
              <p className="text-sm font-bold text-[var(--color-foreground)]">
                μ = {result.mean_col1} <span className="text-[var(--color-muted-foreground)] font-normal">σ = {result.std_col1}</span>
              </p>
            </div>
            <div className="bg-[var(--color-muted)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--color-muted-foreground)] mb-1 uppercase">{result.col2}</p>
              <p className="text-sm font-bold text-[var(--color-foreground)]">
                μ = {result.mean_col2} <span className="text-[var(--color-muted-foreground)] font-normal">σ = {result.std_col2}</span>
              </p>
            </div>
          </div>
        )}

        <div className="px-4 pb-4">
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed bg-[var(--color-muted)] rounded-xl p-3">
            {result.interpretation}
          </p>
        </div>
      </div>

      {/* Stat test insight */}
      <ChartInsightCard
        title="Hypothesis Test Result"
        description={sig
          ? `The test found a statistically significant relationship between "${result.col1}" and "${result.col2}" (p < 0.05). This means the observed difference is unlikely due to random chance.`
          : `No statistically significant relationship found between "${result.col1}" and "${result.col2}" (p ≥ 0.05). The observed differences could be due to random variation.`
        }
        insights={[
          `Test type: ${testLabels[result.test_type] || result.test_type}`,
          `p-value: ${result.p_value < 0.0001 ? '< 0.0001' : result.p_value?.toFixed(4)} (significance threshold: 0.05)`,
          sig ? 'This relationship has practical implications for business decisions' : 'Consider increasing sample size or testing with different variables',
        ]}
        recommendations={sig
          ? ['Investigate the causal mechanism behind this relationship', 'Factor this relationship into predictive models']
          : ['Try testing with related variables or subsets of the data', 'Consider non-linear relationships that Pearson tests may miss']
        }
      />
    </div>
  );
}