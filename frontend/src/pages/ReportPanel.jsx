/**
 * ReportPanel — PDF report generation with Lucide, shadcn Cards.
 */

import { useState } from 'react';
import { FileText, BarChart3, Briefcase, Crown, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { generateReport } from '../services/api';

export default function ReportPanel() {
  const [role, setRole] = useState('analyst');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const gen = async () => {
    setLoading(true);
    try { const r = await generateReport(role); setReport(r); toast.success('Report ready!'); } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div><h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">PDF Reports</h2><p className="text-zinc-500 text-sm mt-0.5">Generate comprehensive analysis reports</p></div>

      <Card className="max-w-xl mx-auto">
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Generate Report</h3>
            <p className="text-xs text-zinc-500 mt-1">Includes stats, charts, insights, ML results</p>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-2 block text-center">Report Perspective</label>
            <div className="flex gap-2 justify-center">
              {[{ v: 'analyst', l: 'Analyst', I: BarChart3 }, { v: 'manager', l: 'Manager', I: Briefcase }, { v: 'ceo', l: 'CEO', I: Crown }].map(({ v, l, I }) => (
                <Button key={v} variant={role === v ? 'default' : 'outline'} size="sm" onClick={() => setRole(v)}><I className="w-3.5 h-3.5" /> {l}</Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {['Dataset Overview', 'Statistics', 'AI Insights', 'ML Results', 'Anomalies', 'Charts'].map((s) => (
              <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/60 text-xs text-zinc-500 dark:text-zinc-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {s}
              </div>
            ))}
          </div>

          <Button onClick={gen} loading={loading} className="w-full"><FileText className="w-4 h-4" /> Generate & Download</Button>
        </CardContent>
      </Card>

      {report && (
        <Card className="max-w-xl mx-auto animate-fade-in">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>
              <div><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{report.filename}</p><p className="text-xs text-zinc-500">{report.message}</p></div>
            </div>
            <a href={report.report_url} target="_blank" rel="noopener noreferrer">
              <Button variant="success" size="sm"><Download className="w-3.5 h-3.5" /> Download</Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
