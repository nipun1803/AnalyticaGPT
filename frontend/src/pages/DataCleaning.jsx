/**
 * DataCleaning — Premium data preparation tools with live before/after comparison,
 * AI-powered insights on cleaning results, and dynamic dataset refresh.
 */

import { useState, useMemo } from 'react';
import {
  Trash2, Eraser, Filter, Zap, RefreshCw, CheckCircle2, Sparkles,
  ArrowRight, Rows3, Columns3, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import AIInsightCard from '../components/AIInsightCard';
import { cleanData, engineerFeatures } from '../services/api';

const CLEANING_OPTIONS = [
  {
    key: 'drop_duplicates',
    icon: Trash2,
    title: 'Remove Duplicates',
    desc: 'Drop identical rows from the dataset',
    color: 'var(--color-danger)',
  },
  {
    key: 'drop_null_rows',
    icon: Filter,
    title: 'Drop Null Rows',
    desc: 'Remove rows with any missing data',
    color: 'var(--color-warning)',
  },
  {
    key: 'fill_numeric_nulls',
    icon: Eraser,
    title: 'Impute Nulls',
    desc: 'Fill missing numeric values automatically',
    color: 'var(--color-primary)',
  },
  {
    key: 'handle_outliers',
    icon: Zap,
    title: 'Outlier Handling',
    desc: 'Clip outliers using IQR method (1.5×)',
    color: 'var(--color-secondary)',
  },
];

export default function DataCleaning({ datasetInfo, onDatasetUpdated }) {
  const [loading, setLoading] = useState(false);
  const [engineering, setEngineering] = useState(false);
  const [options, setOptions] = useState({
    drop_duplicates: true,
    drop_null_rows: false,
    fill_numeric_nulls: true,
    numeric_strategy: 'mean',
    handle_outliers: false,
  });
  const [report, setReport] = useState(null);
  const [beforeInfo, setBeforeInfo] = useState(null);
  const [afterInfo, setAfterInfo] = useState(null);

  const activeCount = useMemo(
    () => Object.entries(options).filter(([k, v]) => typeof v === 'boolean' && v).length,
    [options],
  );

  const handleEngineer = async () => {
    setEngineering(true);
    try {
      const res = await engineerFeatures();
      setReport({ type: 'engineering', new_features: res.new_features, descriptions: res.descriptions || [] });
      if (res.updated_info) {
        setAfterInfo(res.updated_info);
        if (onDatasetUpdated) onDatasetUpdated(res.updated_info);
      }
      toast.success(res.message);
    } catch {
      toast.error('Feature engineering failed');
    } finally {
      setEngineering(false);
    }
  };

  const handleClean = async () => {
    // Capture before state
    if (datasetInfo) {
      setBeforeInfo({
        rows: datasetInfo.rows,
        columns: datasetInfo.columns,
        missing: Object.values(datasetInfo.missing_values || {}).reduce((a, b) => a + b, 0),
      });
    }
    setLoading(true);
    setAfterInfo(null);
    try {
      const res = await cleanData(options);
      const afterMissing = res.updated_info
        ? Object.values(res.updated_info.missing_values || {}).reduce((a, b) => a + b, 0)
        : null;

      setReport({ type: 'cleaning', ...res.report });
      if (res.updated_info) {
        setAfterInfo({
          rows: res.updated_info.rows,
          columns: res.updated_info.columns,
          missing: afterMissing,
        });
        if (onDatasetUpdated) onDatasetUpdated(res.updated_info);
      }
      toast.success(res.message);
    } catch {
      toast.error('Cleaning failed');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key) => setOptions((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Data Preparation</h2>
          <p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">
            Clean, transform, and engineer features for your dataset
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleEngineer}
          loading={engineering}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" /> Auto Feature Engineering
        </Button>
      </div>

      {/* Main content: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cleaning options */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-[color:var(--color-primary)]" />
                Cleaning Pipeline
              </span>
              <Badge variant="secondary" className="text-[10px]">{activeCount} active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CLEANING_OPTIONS.map(({ key, icon: Icon, title, desc, color }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left group ${
                    options[key]
                      ? 'border-[color:var(--color-primary)]/40 bg-[color:var(--color-primary)]/[0.04] shadow-sm'
                      : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-muted-foreground)]/30'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      options[key] ? 'bg-[color:var(--color-primary)]/10' : 'bg-[var(--color-muted)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" style={{ color: options[key] ? color : 'var(--color-muted-foreground)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${options[key] ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}>
                      {title}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)] opacity-70 mt-0.5">{desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    options[key]
                      ? 'bg-[color:var(--color-primary)] border-[color:var(--color-primary)]'
                      : 'border-[var(--color-border)]'
                  }`}>
                    {options[key] && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-background)]" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Imputation strategy selector */}
            {options.fill_numeric_nulls && (
              <div className="p-4 bg-[var(--color-muted)]/40 rounded-xl space-y-3 border border-[var(--color-border)]/50">
                <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest">
                  Imputation Strategy
                </p>
                <div className="flex gap-2">
                  {['mean', 'median', 'zero'].map((s) => (
                    <Button
                      key={s}
                      variant={options.numeric_strategy === s ? 'default' : 'outline'}
                      size="sm"
                      className="capitalize text-xs"
                      onClick={() => setOptions((p) => ({ ...p, numeric_strategy: s }))}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleClean} loading={loading} className="gap-2 px-8">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Run Cleaning Pipeline
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Results panel */}
        <div className="space-y-4">
          {/* Before / After comparison */}
          {beforeInfo && afterInfo && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[color:var(--color-success)]" />
                  Before → After
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <CompareRow
                    icon={Rows3}
                    label="Rows"
                    before={beforeInfo.rows}
                    after={afterInfo.rows}
                    format={(v) => v?.toLocaleString()}
                  />
                  <CompareRow
                    icon={Columns3}
                    label="Columns"
                    before={beforeInfo.columns}
                    after={afterInfo.columns}
                  />
                  <CompareRow
                    icon={AlertTriangle}
                    label="Missing Values"
                    before={beforeInfo.missing}
                    after={afterInfo.missing}
                    goodIfLower
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Report */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[color:var(--color-primary)]" />
                Action Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!report ? (
                <div className="h-40 flex items-center justify-center text-[var(--color-muted-foreground)] text-sm italic">
                  Run an action to see results...
                </div>
              ) : report.type === 'engineering' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-[var(--color-muted)]/50 rounded-lg">
                    <span className="text-[var(--color-muted-foreground)] text-sm">Features Created</span>
                    <Badge variant="secondary">{report.new_features?.length || 0}</Badge>
                  </div>

                  {report.descriptions?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                        What Was Done
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {report.descriptions.map((desc, i) => (
                          <div
                            key={i}
                            className="text-xs text-[var(--color-muted-foreground)] flex items-start gap-2 bg-[var(--color-muted)]/30 p-2.5 rounded-lg border border-[var(--color-border)]/40"
                          >
                            <span className="text-[color:var(--color-success)] font-bold mt-0.5 shrink-0">✓</span>
                            {desc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.new_features?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                        New Columns
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.new_features.map((feat, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            <Sparkles className="w-2.5 h-2.5 mr-1" /> {feat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-[var(--color-muted)]/50 rounded-lg">
                    <span className="text-[var(--color-muted-foreground)] text-sm">Rows Removed</span>
                    <Badge variant={report.rows_removed > 0 ? 'warning' : 'secondary'}>
                      {report.rows_removed}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                      Actions Taken
                    </p>
                    {report.actions?.length === 0 ? (
                      <p className="text-xs text-[var(--color-muted-foreground)]">No actions needed.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {report.actions?.map((act, i) => (
                          <div
                            key={i}
                            className="text-xs text-[var(--color-muted-foreground)] flex items-start gap-2 bg-[var(--color-muted)]/30 p-2.5 rounded-lg border border-[var(--color-border)]/40"
                          >
                            <span className="text-[color:var(--color-primary)] font-bold mt-0.5 shrink-0">•</span>
                            {act}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Insight on the cleaning result */}
      {report && (
        <AIInsightCard
          type="cleaning"
          data={{
            report_type: report.type,
            actions: report.actions || report.descriptions || [],
            rows_removed: report.rows_removed || 0,
            new_features: report.new_features || [],
            before: beforeInfo,
            after: afterInfo,
          }}
        />
      )}
    </div>
  );
}

/** Before → After comparison row */
function CompareRow({ icon: Icon, label, before, after, format = (v) => v, goodIfLower = false }) {
  const diff = after - before;
  const improved = goodIfLower ? diff < 0 : diff > 0;
  const changed = diff !== 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-[var(--color-muted)]/60 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">{label}</p>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-[var(--color-muted-foreground)]">{format(before)}</span>
        <ArrowRight className="w-3 h-3 text-[var(--color-muted-foreground)]/50" />
        <span className={`font-semibold ${
          !changed ? 'text-[var(--color-muted-foreground)]'
            : improved ? 'text-[color:var(--color-success)]'
            : 'text-[color:var(--color-warning)]'
        }`}>
          {format(after)}
        </span>
        {changed && (
          <span className={`text-[10px] ${improved ? 'text-[color:var(--color-success)]' : 'text-[color:var(--color-warning)]'}`}>
            ({diff > 0 ? '+' : ''}{diff})
          </span>
        )}
      </div>
    </div>
  );
}
