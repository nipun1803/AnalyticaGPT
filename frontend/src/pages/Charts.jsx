/**
 * Charts — Smart visualizations with proper labeling and business insights
 * below every chart. Each chart includes: title, axis labels, legend,
 * and a structured insight card (Problem · Approach · Key Insights · Recommendations).
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Activity, Lightbulb, Network, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SkeletonChart } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { getSummary } from '../services/api';
import AIInsightCard from '../components/AIInsightCard';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#6366F1', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#A78BFA'];
const TT = {
  contentStyle: {
    background: 'var(--color-card)', border: '1px solid var(--color-border)',
    borderRadius: '12px', color: 'var(--color-foreground)', fontSize: '12px',
  },
};

/* ── Insight Card Component ───────────────────────────────── */
function ChartInsightCard({ title, description, insights = [], recommendations = [], approach }) {
  return (
    <Card className="border-l-4 border-l-[color:var(--color-primary)] bg-[color:var(--color-primary)]/[0.03]">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[color:var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4 text-[color:var(--color-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[color:var(--color-primary)] uppercase tracking-widest mb-1">
              Chart Insight — {title}
            </p>
            <p className="text-sm text-[var(--color-foreground)] leading-relaxed">{description}</p>
          </div>
        </div>

        {approach && (
          <div className="pl-11">
            <p className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-1">Approach</p>
            <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">{approach}</p>
          </div>
        )}

        {insights.length > 0 && (
          <div className="pl-11">
            <p className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest mb-1">Key Insights</p>
            <ul className="space-y-1">
              {insights.map((ins, i) => (
                <li key={i} className="text-xs text-[var(--color-muted-foreground)] flex items-start gap-2">
                  <span className="text-[color:var(--color-primary)] font-bold mt-0.5">→</span> {ins}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="pl-11">
            <p className="text-[10px] font-bold text-[color:var(--color-success)] uppercase tracking-widest mb-1">Recommendations</p>
            <ul className="space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-[var(--color-muted-foreground)] flex items-start gap-2">
                  <span className="text-[color:var(--color-success)] font-bold mt-0.5">✓</span> {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Charts({ summaryData, setSummaryData }) {
  const [tab, setTab] = useState('quality');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    if (!summaryData) {
      const fetchSummary = async () => {
        setLoading(true);
        try {
          const data = await getSummary();
          if (mounted) setSummaryData(data);
        } catch {
          if (mounted) toast.error('Failed to load summary');
        } finally {
          if (mounted) setLoading(false);
        }
      };
      fetchSummary();
    }
    return () => { mounted = false; };
  }, [summaryData, setSummaryData]);

  if (loading || !summaryData) {
    return <div className="space-y-6"><SkeletonChart /><SkeletonChart /></div>;
  }

  const num = summaryData?.statistics?.numeric_summary || {};
  const cat = summaryData?.statistics?.categorical_summary || {};
  const corr = summaryData?.correlation || {};

  const numCols = Object.keys(num);
  const catCols = Object.keys(cat);
  const totalRows = summaryData?.statistics?.shape?.rows || 1;

  /* ── Prepare chart data ── */
  const statsData = numCols.map((c) => {
    const mean = num[c].mean || 0;
    const std = num[c].std || 1;
    const min = num[c].min || 0;
    const max = num[c].max || 0;
    return {
      name: c.length > 16 ? c.slice(0, 16) + '…' : c,
      fullName: c,
      zMax: +((max - mean) / (std || 1)).toFixed(2),
      zMin: +((min - mean) / (std || 1)).toFixed(2),
      skewness: +(num[c].skewness?.toFixed(3) || 0),
      kurtosis: +(num[c].kurtosis?.toFixed(3) || 0),
    };
  });

  const qualityData = [
    ...numCols.map(c => ({
      name: c.length > 14 ? c.slice(0, 14) + '…' : c,
      fullName: c,
      missingRatio: +(((totalRows - (num[c].count || totalRows)) / totalRows) * 100).toFixed(1)
    })),
    ...catCols.map(c => ({
      name: c.length > 14 ? c.slice(0, 14) + '…' : c,
      fullName: c,
      missingRatio: +(((cat[c].null_count || 0) / totalRows) * 100).toFixed(1)
    }))
  ].sort((a, b) => b.missingRatio - a.missingRatio).slice(0, 20);

  const catUniqueData = catCols.map((c) => ({
    name: c.length > 14 ? c.slice(0, 14) + '…' : c,
    fullName: c,
    unique: cat[c].unique || 0,
  })).sort((a, b) => b.unique - a.unique).slice(0, 20);

  /* ── Dynamic insight generators ── */
  const missingCols = qualityData.filter(d => d.missingRatio > 0);
  const highMissing = qualityData.filter(d => d.missingRatio > 20);
  const outlierCols = statsData.filter(d => Math.abs(d.zMax) > 3 || Math.abs(d.zMin) > 3);
  const skewedCols = statsData.filter(d => Math.abs(d.skewness) > 1);
  const highCardCols = catUniqueData.filter(d => d.unique > 50);

  const tabs = [
    { key: 'quality', label: 'Data Quality', icon: Activity },
    { key: 'outliers', label: 'Outliers (Z-Scores)', icon: TrendingUp },
    { key: 'cardinality', label: 'Cardinality', icon: Hash },
    { key: 'shape', label: 'Distribution Shape', icon: PieChartIcon },
    { key: 'correlation', label: 'Correlation Matrix', icon: Network },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Visualizations</h2>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">
          {numCols.length} numeric · {catCols.length} categorical features · {totalRows.toLocaleString()} records
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={tab === key ? 'default' : 'secondary'} size="sm" onClick={() => setTab(key)}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </Button>
        ))}
      </div>

      {/* ── QUALITY: Missing Values ── */}
      {tab === 'quality' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-[color:var(--color-primary)]" />
                Missing Values Ratio by Feature
                <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
                  Percentage of null/missing values per column
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {qualityData.length === 0 || qualityData.every(d => d.missingRatio === 0) ? (
                  <EmptyState icon={Activity} title="Data is Clean" description="No missing values found in the dataset!" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={qualityData} margin={{ bottom: 60, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                        angle={-35} textAnchor="end"
                        label={{ value: 'Feature Name', position: 'insideBottom', offset: -50, fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                        label={{ value: 'Missing %', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      />
                      <Tooltip {...TT} formatter={(v) => [`${v}%`, 'Missing Ratio']} />
                      <Legend verticalAlign="top" height={30} />
                      <Bar dataKey="missingRatio" fill="var(--color-danger)" radius={[6, 6, 0, 0]} name="Missing %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <ChartInsightCard
            title="Data Quality Assessment"
            description={
              missingCols.length === 0
                ? "The dataset has no missing values — data quality is excellent. All features are complete and ready for analysis."
                : `${missingCols.length} out of ${numCols.length + catCols.length} features contain missing values. ${highMissing.length > 0 ? `${highMissing.length} feature(s) exceed 20% missing data, which can bias model training and statistical conclusions.` : 'All missing ratios are below 20%, which is manageable with standard imputation.'}`
            }
            approach="Missing values were computed as (total_rows − non_null_count) / total_rows × 100 for each column. This identifies data gaps that could affect downstream analysis."
            insights={[
              missingCols.length > 0 ? `Top missing feature: "${missingCols[0]?.fullName}" at ${missingCols[0]?.missingRatio}% missing` : 'No missing data detected — dataset is fully complete',
              `Dataset has ${totalRows.toLocaleString()} rows across ${numCols.length + catCols.length} features`,
              highMissing.length > 0 ? `⚠ ${highMissing.length} feature(s) with >20% missing may require column-level decisions (drop vs impute)` : '✓ All features are within acceptable completeness thresholds',
            ]}
            recommendations={[
              highMissing.length > 0 ? 'Consider dropping features with >50% missing data as imputation may introduce noise' : 'No action needed — data quality is sufficient for analysis',
              missingCols.length > 0 ? 'Use the Data Cleaning page to apply imputation (mean/median/mode) before running ML models' : 'Proceed directly to EDA and ML analysis',
            ]}
          />
        </div>
      )}

      {/* ── OUTLIERS: Z-Scores ── */}
      {tab === 'outliers' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[color:var(--color-primary)]" />
                Feature Outlier Detection — Z-Score Analysis
                <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
                  Standard deviations of min/max from mean for each numeric feature
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData} margin={{ bottom: 60, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                      angle={-35} textAnchor="end"
                      label={{ value: 'Numeric Feature', position: 'insideBottom', offset: -50, fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                      domain={['auto', 'auto']}
                      label={{ value: 'Z-Score (σ)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    />
                    <Tooltip {...TT} formatter={(v, name) => [v?.toFixed(2), name]} />
                    <Legend verticalAlign="top" height={30} />
                    <Bar dataKey="zMax" fill="#EF4444" radius={[6, 6, 0, 0]} name="Max Z-Score (upper outlier boundary)" />
                    <Bar dataKey="zMin" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Min Z-Score (lower outlier boundary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <ChartInsightCard
            title="Outlier Risk Assessment"
            description={
              outlierCols.length === 0
                ? "No features exhibit extreme outliers (all Z-scores within ±3σ). The numeric distributions are reasonably bounded."
                : `${outlierCols.length} feature(s) have values beyond ±3 standard deviations from the mean, indicating potential outliers that could distort model predictions and summary statistics.`
            }
            approach="Z-scores are calculated as (value − mean) / std_dev for both min and max of each feature. Values beyond ±3σ typically indicate outliers requiring investigation."
            insights={[
              outlierCols.length > 0 ? `Features with extreme Z-scores: ${outlierCols.map(d => d.fullName).join(', ')}` : 'All features are within normal Z-score ranges',
              `Analyzed ${statsData.length} numeric features for outlier patterns`,
              'Z-scores beyond ±3 affect model training, mean calculations, and correlation estimates',
            ]}
            recommendations={[
              outlierCols.length > 0 ? 'Apply IQR-based outlier clipping via Data Cleaning before ML training' : 'No outlier treatment needed',
              'Consider using robust statistics (median instead of mean) for skewed features',
            ]}
          />
        </div>
      )}

      {/* ── CARDINALITY ── */}
      {tab === 'cardinality' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="w-4 h-4 text-[color:var(--color-primary)]" />
                Categorical Feature Cardinality
                <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
                  Number of unique values per categorical column
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {catUniqueData.length === 0 ? (
                  <EmptyState icon={BarChart3} title="No Categorical Data" description="This dataset does not contain any categorical columns." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catUniqueData} margin={{ bottom: 40, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                        angle={-35} textAnchor="end"
                        label={{ value: 'Categorical Feature', position: 'insideBottom', offset: -35, fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                        label={{ value: 'Unique Count', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      />
                      <Tooltip {...TT} formatter={(v) => [v, 'Unique Values']} />
                      <Legend verticalAlign="top" height={30} />
                      <Bar dataKey="unique" fill="var(--color-secondary)" radius={[6, 6, 0, 0]} name="Unique Categories" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <ChartInsightCard
            title="Feature Cardinality Analysis"
            description={
              catUniqueData.length === 0
                ? "No categorical features detected in this dataset."
                : `${catCols.length} categorical features analyzed. ${highCardCols.length > 0 ? `${highCardCols.length} feature(s) have very high cardinality (>50 unique values), suggesting they may be ID fields or free-text — not suitable for direct ML encoding.` : 'All categorical features have manageable cardinality for one-hot or label encoding.'}`
            }
            approach="Unique value counts were computed for each categorical (object/category dtype) column. High cardinality is flagged at >50 unique values."
            insights={[
              catUniqueData.length > 0 ? `Highest cardinality: "${catUniqueData[0]?.fullName}" with ${catUniqueData[0]?.unique} unique values` : 'No categorical data available',
              highCardCols.length > 0 ? `⚠ ${highCardCols.map(d => d.fullName).join(', ')} may be ID or text fields` : '✓ All features have encoding-friendly cardinality',
              `${catCols.length} categorical vs ${numCols.length} numeric features in total`,
            ]}
            recommendations={[
              highCardCols.length > 0 ? 'Drop or hash high-cardinality features (>100 unique) before ML training' : 'Categorical features can be safely one-hot encoded',
              'Use target encoding for high-cardinality columns if they carry predictive signal',
            ]}
          />
        </div>
      )}

      {/* ── SHAPE: Skewness & Kurtosis ── */}
      {tab === 'shape' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[color:var(--color-primary)]" />
                Distribution Shape — Skewness & Kurtosis
                <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
                  Measures of asymmetry and tail heaviness for numeric features
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData} margin={{ bottom: 60, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                      angle={-35} textAnchor="end"
                      label={{ value: 'Numeric Feature', position: 'insideBottom', offset: -50, fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                      label={{ value: 'Coefficient Value', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    />
                    <Tooltip {...TT} formatter={(v, name) => [v?.toFixed(3), name]} />
                    <Legend verticalAlign="top" height={30} />
                    <Bar dataKey="skewness" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Skewness (asymmetry)" />
                    <Bar dataKey="kurtosis" fill="#EF4444" radius={[6, 6, 0, 0]} name="Kurtosis (tail weight)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-[var(--color-muted-foreground)]">
                <div className="p-3 rounded-lg bg-[var(--color-muted)]">
                  <strong className="text-[var(--color-foreground)]">Skewness:</strong> 0 = symmetric, positive = right tail, negative = left tail. |skew| &gt; 1 = significantly skewed.
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-muted)]">
                  <strong className="text-[var(--color-foreground)]">Kurtosis:</strong> 0 = normal distribution, positive = heavy tails (outlier-prone), negative = light tails.
                </div>
              </div>
            </CardContent>
          </Card>

          <ChartInsightCard
            title="Distribution Shape Assessment"
            description={
              skewedCols.length === 0
                ? "All numeric features are approximately symmetric (|skewness| < 1). This is favorable for models assuming normal distributions."
                : `${skewedCols.length} feature(s) are significantly skewed (|skewness| > 1), which violates normality assumptions in parametric tests and linear models.`
            }
            approach="Skewness and kurtosis are computed from the 3rd and 4th standardized moments of each distribution. These shape metrics inform whether transformations are needed before modeling."
            insights={[
              skewedCols.length > 0 ? `Highly skewed features: ${skewedCols.map(d => d.fullName).join(', ')}` : 'All distributions are approximately normal',
              `${statsData.filter(d => Math.abs(d.kurtosis) > 3).length} feature(s) show heavy tails (high kurtosis), indicating outlier-prone distributions`,
              'Skewed features can distort mean-based imputation and linear regression coefficients',
            ]}
            recommendations={[
              skewedCols.length > 0 ? 'Apply log or Box-Cox transformation to highly skewed features before regression' : 'No transformations needed for distribution shape',
              'Use non-parametric tests (Mann-Whitney, Kruskal-Wallis) for significantly non-normal features',
            ]}
          />
        </div>
      )}

      {/* ── Correlation Matrix ── */}
      {tab === 'correlation' && corr?.columns && corr.columns.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Network className="w-4 h-4 text-[color:var(--color-primary)]" />
                Pearson Correlation Matrix
                <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-2">
                  Linear relationships between numeric features (−1 to +1)
                </span>
              </CardTitle>
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
                Strong correlations (|r| &gt; 0.7) are shown in bold. Blue = positive correlation, Red = negative correlation.
              </p>
            </CardContent>
          </Card>

          <ChartInsightCard
            title="Correlation Analysis"
            description={(() => {
              const strongPairs = [];
              corr.columns.forEach((r, i) => {
                corr.columns.forEach((c, j) => {
                  if (i < j && Math.abs(corr.values[i][j]) > 0.7) {
                    strongPairs.push({ a: r, b: c, v: corr.values[i][j] });
                  }
                });
              });
              return strongPairs.length === 0
                ? 'No strong linear correlations (|r| > 0.7) detected between features. This suggests features are relatively independent.'
                : `${strongPairs.length} strong correlation pair(s) detected. Highly correlated features may cause multicollinearity in regression models.`;
            })()}
            approach="Pearson correlation coefficients measure linear relationships between all numeric feature pairs. Values near ±1 indicate strong linear dependency."
            insights={[
              `Correlation matrix covers ${corr.columns.length} numeric features`,
              'Strong positive correlations may indicate redundant features that can be consolidated',
              'Strong negative correlations reveal inverse relationships useful for feature selection',
            ]}
            recommendations={[
              'Remove one feature from highly correlated pairs (|r| > 0.9) to reduce multicollinearity',
              'Use VIF (Variance Inflation Factor) analysis for more rigorous multicollinearity detection',
            ]}
          />
        </div>
      )}

      {/* AI Insight for current tab */}
      {summaryData && tab === 'overview' && numCols.length > 0 && (
        <AIInsightCard
          type="chart_overview"
          data={{ features: numCols.slice(0, 10), stats: statsData.slice(0, 8) }}
        />
      )}
      {summaryData && tab === 'shape' && (
        <AIInsightCard
          type="chart_shape"
          data={{ features: statsData.map(d => ({ name: d.fullName, skewness: d.skewness, kurtosis: d.kurtosis })).slice(0, 10) }}
        />
      )}
      {summaryData && corr?.columns?.length > 0 && tab !== 'categorical' && tab !== 'shape' && tab !== 'spread' && (
        <AIInsightCard
          type="correlation"
          data={{ columns: corr.columns.slice(0, 8), sample_values: corr.values?.slice(0, 5)?.map(r => r.slice(0, 5)) }}
        />
      )}
    </div>
  );
}
