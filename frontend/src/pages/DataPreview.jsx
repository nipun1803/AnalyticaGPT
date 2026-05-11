/**
 * DataPreview — Paginated table with search, Lucide icons, shadcn Cards.
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Hash, Type, Columns3, ChevronDown, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { getPreview, getColumns, exportData } from '../services/api';

export default function DataPreview() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(25);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    Promise.all([getPreview(100), getColumns()])
      .then(([p, c]) => { setData(p); setColumns(c); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data?.preview) return [];
    if (!search) return data.preview.slice(0, visible);
    return data.preview.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))).slice(0, visible);
  }, [data, search, visible]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await exportData(format);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <div className="space-y-4"><SkeletonCard rows={2} /><SkeletonCard rows={6} /></div>;
  if (!data) return <EmptyState icon={Columns3} title="No Data Loaded" description="Please upload or select a dataset first." />;

  const cols = data.columns || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Data Preview</h2><p className="text-zinc-500 text-sm mt-0.5">{filtered.length} of {data.total_rows?.toLocaleString()} rows</p></div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-60" /></div>
      </div>

      {columns && (
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary"><Hash className="w-3 h-3 mr-1" /> {columns.numeric_columns?.length || 0} Numeric</Badge>
            <Badge variant="secondary"><Type className="w-3 h-3 mr-1" /> {columns.categorical_columns?.length || 0} Categorical</Badge>
            <Badge variant="secondary"><Columns3 className="w-3 h-3 mr-1" /> {cols.length} Total</Badge>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest px-2 font-semibold">Export</span>
            <Button variant="ghost" size="sm" onClick={() => handleExport('csv')} loading={exporting === 'csv'} className="h-7 text-xs hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"><FileText className="w-3.5 h-3.5 mr-1" /> CSV</Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport('json')} loading={exporting === 'json'} className="h-7 text-xs hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"><FileJson className="w-3.5 h-3.5 mr-1" /> JSON</Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport('excel')} loading={exporting === 'excel'} className="h-7 text-xs hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel</Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm relative">
            <thead className="sticky top-0 z-10 bg-white dark:bg-black shadow-sm">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">#</th>
                {cols.map((c) => <th key={c} className="px-3 py-3 text-left text-[10px] text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 whitespace-nowrap bg-white dark:bg-black">{c}</th>)}
              </tr>
            </thead>
            <tbody>{filtered.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-3 py-2 text-zinc-600 border-b border-zinc-200 dark:border-zinc-800/30 text-xs">{i + 1}</td>
                {cols.map((c) => <td key={c} className="px-3 py-2 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800/30 max-w-[160px] truncate text-xs">{row[c] != null ? String(row[c]) : <span className="text-zinc-400 dark:text-zinc-600 italic">null</span>}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>

      {filtered.length >= visible && (
        <div className="text-center"><Button variant="outline" size="sm" onClick={() => setVisible((v) => v + 25)}><ChevronDown className="w-4 h-4" /> Load More</Button></div>
      )}
    </div>
  );
}
