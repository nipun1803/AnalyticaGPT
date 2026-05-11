/**
 * DataCleaning — Automated cleaning tools with shadcn aesthetics.
 */

import { useState } from 'react';
import { Trash2, Eraser, Filter, Zap, RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cleanData, engineerFeatures } from '../services/api';

export default function DataCleaning({ onCleanSuccess }) {
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

  const handleEngineer = async () => {
    setEngineering(true);
    try {
      const res = await engineerFeatures();
      setReport({ type: 'engineering', new_features: res.new_features, descriptions: res.descriptions || [] });
      toast.success(res.message);
      if (onCleanSuccess) onCleanSuccess();
    } catch {
      toast.error('Feature engineering failed');
    } finally {
      setEngineering(false);
    }
  };

  const handleClean = async () => {
    setLoading(true);
    try {
      const res = await cleanData(options);
      setReport({ type: 'cleaning', ...res.report });
      toast.success(res.message);
      if (onCleanSuccess) onCleanSuccess();
    } catch {
      toast.error('Cleaning failed');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key) => setOptions((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Data Preparation</h2>
          <p className="text-zinc-500 text-sm">Automated tools to refine, sanitize, and engineer your dataset</p>
        </div>
        <Button variant="outline" onClick={handleEngineer} loading={engineering} className="bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800">
          <Sparkles className="w-4 h-4 mr-2" /> Auto Feature Engineering
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => toggle('drop_duplicates')}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${options.drop_duplicates ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-700'}`}>
              <div className={`p-2 rounded-lg ${options.drop_duplicates ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800'}`}><Trash2 className="w-5 h-5" /></div>
              <div><p className="font-semibold text-sm">Remove Duplicates</p><p className="text-xs opacity-60">Drop identical rows</p></div>
            </button>

            <button onClick={() => toggle('drop_null_rows')}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${options.drop_null_rows ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-700'}`}>
              <div className={`p-2 rounded-lg ${options.drop_null_rows ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800'}`}><Filter className="w-5 h-5" /></div>
              <div><p className="font-semibold text-sm">Drop Null Rows</p><p className="text-xs opacity-60">Remove rows with any missing data</p></div>
            </button>

            <button onClick={() => toggle('fill_numeric_nulls')}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${options.fill_numeric_nulls ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-700'}`}>
              <div className={`p-2 rounded-lg ${options.fill_numeric_nulls ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800'}`}><Eraser className="w-5 h-5" /></div>
              <div><p className="font-semibold text-sm">Impute Nulls</p><p className="text-xs opacity-60">Fill missing numeric values</p></div>
            </button>

            <button onClick={() => toggle('handle_outliers')}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${options.handle_outliers ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-700'}`}>
              <div className={`p-2 rounded-lg ${options.handle_outliers ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800'}`}><Zap className="w-5 h-5" /></div>
              <div><p className="font-semibold text-sm">Outlier Handling</p><p className="text-xs opacity-60">Clip outliers using IQR method</p></div>
            </button>
          </div>

          {options.fill_numeric_nulls && (
            <div className="p-4 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Imputation Strategy</p>
              <div className="flex gap-2">
                {['mean', 'median', 'zero'].map((s) => (
                  <Button key={s} variant={options.numeric_strategy === s ? 'default' : 'outline'} size="sm" className="capitalize" onClick={() => setOptions(p => ({ ...p, numeric_strategy: s }))}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleClean} loading={loading} className="gap-2 px-8">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Run Cleaning
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-zinc-900/30 border-dashed border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-zinc-900 dark:text-zinc-100" /> Action Report
          </h3>
          {!report ? (
            <div className="h-48 flex items-center justify-center text-zinc-600 text-sm italic">
              Run an action to see results...
            </div>
          ) : report.type === 'engineering' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400 text-sm">Features Created</span>
                <Badge variant="secondary">{report.new_features?.length || 0}</Badge>
              </div>
              {report.descriptions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase">What Was Done</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                    {report.descriptions.map((desc, i) => (
                      <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2 bg-white dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold mt-0.5">✓</span> {desc}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase">New Columns</p>
                {(!report.new_features || report.new_features.length === 0) ? (
                  <p className="text-sm text-zinc-600">Dataset already has well-structured features — no additional engineering needed.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {report.new_features.map((feat, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" /> {feat}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400 text-sm">Rows Removed</span>
                <Badge variant="secondary">{report.rows_removed}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase">Actions Taken</p>
                {report.actions?.length === 0 ? (
                  <p className="text-sm text-zinc-600">No actions needed.</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
                    {report.actions?.map((act, i) => (
                      <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold mt-1">•</span> {act}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
