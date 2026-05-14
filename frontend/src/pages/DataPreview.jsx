/**
 * DataPreview — Dynamic server-side paginated table with search, sort, Lucide icons, shadcn Cards.
 * Refreshes automatically when the dataset changes (cleaning, feature engineering, etc.)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Hash, Type, Columns3, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  FileJson, FileSpreadsheet, FileText, ArrowUpDown, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { getPreview, getColumns, exportData } from '../services/api';

export default function DataPreview({ datasetInfo }) {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [exporting, setExporting] = useState(null);
  const debounceTimer = useRef(null);

  // Debounce search input
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on new search
    }, 400);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        getPreview(pageSize, page, sortBy, sortOrder, debouncedSearch || null),
        getColumns(),
      ]);
      setData(p);
      setColumns(c);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, debouncedSearch]);

  // Re-fetch when dataset changes (datasetInfo reference changes after clean/engineer)
  useEffect(() => {
    fetchData();
  }, [fetchData, datasetInfo]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
    setPage(1);
  };

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

  if (loading && !data) return <div className="space-y-4"><SkeletonCard rows={2} /><SkeletonCard rows={6} /></div>;
  if (!data) return <EmptyState icon={Columns3} title="No Data Loaded" description="Please upload or select a dataset first." />;

  const cols = data.columns || [];
  const totalPages = data.total_pages || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Data Preview</h2>
          <p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">
            {data.total_filtered !== data.total_rows ? (
              <>{data.total_filtered.toLocaleString()} filtered of {data.total_rows.toLocaleString()} rows</>
            ) : (
              <>{data.total_rows.toLocaleString()} rows · {cols.length} columns</>
            )}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <Input
            placeholder="Search all columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {/* Column type badges + Export */}
      {columns && (
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">
              <Hash className="w-3 h-3 mr-1" /> {columns.numeric_columns?.length || 0} Numeric
            </Badge>
            <Badge variant="secondary">
              <Type className="w-3 h-3 mr-1" /> {columns.categorical_columns?.length || 0} Categorical
            </Badge>
            <Badge variant="secondary">
              <Columns3 className="w-3 h-3 mr-1" /> {cols.length} Total
            </Badge>
          </div>

          <div className="flex items-center gap-2 bg-[var(--color-card)] p-1.5 rounded-lg border border-[var(--color-border)]">
            <span className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest px-2 font-semibold">Export</span>
            <Button variant="ghost" size="sm" onClick={() => handleExport('csv')} loading={exporting === 'csv'} className="h-7 text-xs">
              <FileText className="w-3.5 h-3.5 mr-1" /> CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport('json')} loading={exporting === 'json'} className="h-7 text-xs">
              <FileJson className="w-3.5 h-3.5 mr-1" /> JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport('excel')} loading={exporting === 'excel'} className="h-7 text-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[color:var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-[var(--color-muted-foreground)]">Loading...</span>
            </div>
          ) : (
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 z-10 bg-[var(--color-card)] shadow-sm">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-semibold border-b border-[var(--color-border)] bg-[var(--color-card)]">
                    #
                  </th>
                  {cols.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-3 text-left text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-semibold border-b border-[var(--color-border)] whitespace-nowrap bg-[var(--color-card)] cursor-pointer hover:text-[var(--color-foreground)] transition-colors group select-none"
                      onClick={() => handleSort(c)}
                    >
                      <span className="flex items-center gap-1">
                        {c}
                        {sortBy === c ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-[color:var(--color-primary)]" /> : <ChevronDown className="w-3 h-3 text-[color:var(--color-primary)]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.preview?.map((row, i) => (
                  <tr key={i} className="hover:bg-[var(--color-muted)]/40 transition-colors">
                    <td className="px-3 py-2 text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]/30 text-xs font-mono">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    {cols.map((c) => (
                      <td
                        key={c}
                        className="px-3 py-2 text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]/30 max-w-[180px] truncate text-xs"
                      >
                        {row[c] != null ? (
                          String(row[c])
                        ) : (
                          <span className="text-[color:var(--color-danger)]/60 italic">null</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.preview?.length === 0 && (
                  <tr>
                    <td colSpan={cols.length + 1} className="px-3 py-12 text-center text-[var(--color-muted-foreground)] text-sm">
                      No rows match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Page {page} of {totalPages} · Showing {data.preview?.length || 0} rows per page
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="sm" onClick={() => setPage(1)}
            disabled={page <= 1} className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1} className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Page number buttons */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(pageNum)}
                className="h-8 w-8 p-0 text-xs"
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages} className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline" size="sm" onClick={() => setPage(totalPages)}
            disabled={page >= totalPages} className="h-8 w-8 p-0"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
