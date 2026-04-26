/**
 * FileUpload — Rebuilt with shadcn Card, Lucide icons, new color theme.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle2, FileSpreadsheet, Workflow, Database, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { downloadSampleDataset, getJob, uploadDataset } from '../services/api';

export default function FileUpload({ onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [config, setConfig] = useState({ impute_strategy: 'mean', normalize: true, encode_categoricals: true });

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Only CSV files supported'); return; }
    setUploading(true); setProgress(0);
    try {
      const result = await uploadDataset(file, {
        ...config,
        onProgress: (e) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); },
      });
      toast.success(`Uploaded ${result.filename} — ${result.rows} rows`);
      onSuccess(result);

      if (result.job_id) {
        toast.message("Indexing in background… You can continue browsing.", { duration: 2500 });
        // Fire-and-forget polling: once it completes, notify.
        const jobId = result.job_id;
        const poll = async () => {
          try {
            const st = await getJob(jobId);
            if (st.status === "finished") {
              toast.success("Indexing complete. Chat is ready.");
              return;
            }
            if (st.status === "failed") {
              toast.error("Indexing failed. Chat may not work until re-upload.");
              return;
            }
          } catch {
            return;
          }
          setTimeout(poll, 2000);
        };
        setTimeout(poll, 1200);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally { setUploading(false); setProgress(0); }
  }, [config, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1, disabled: uploading });

  const useSample = async () => {
    setUploading(true);
    setProgress(0);
    try {
      const blob = await downloadSampleDataset();
      const file = new File([blob], "sample_employee_data.csv", { type: "text/csv" });
      const result = await uploadDataset(file, {
        ...config,
        onProgress: (e) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); },
      });
      toast.success(`Loaded sample dataset — ${result.rows} rows`);
      onSuccess(result);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load sample dataset");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Upload Dataset</h2>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-1">Drop a CSV to begin analysis. Data is processed, embedded, and indexed automatically.</p>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={useSample} loading={uploading}>
            Use sample dataset
          </Button>
        </div>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} className={`relative rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all duration-300 group
        ${isDragActive ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5 scale-[1.01]' : 'border-[var(--color-border)] hover:border-[color:var(--color-primary)]/35 bg-[var(--color-card)]'}
        ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
        <input {...getInputProps()} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-48 h-48 rounded-full blur-[80px] transition-opacity duration-500 ${isDragActive ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}`}
            style={{ background: 'radial-gradient(var(--color-secondary), var(--color-accent))' }} />
        </div>
        <div className="relative z-10">
          {uploading ? (
            <div className="space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full border-[3px] border-[color:var(--color-primary)] border-t-transparent animate-spin" />
              <p className="text-[var(--color-muted-foreground)] text-sm">Processing & indexing dataset...</p>
              <div className="max-w-xs mx-auto">
                <div className="h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary), var(--color-accent))' }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-muted)] border border-[var(--color-border)] flex items-center justify-center group-hover:scale-110 group-hover:border-[color:var(--color-primary)]/40 transition-all">
                <Upload className="w-7 h-7 text-[var(--color-muted-foreground)] group-hover:text-[color:var(--color-primary)] transition-colors" />
              </div>
              <div>
                <p className="text-base font-medium text-[var(--color-foreground)]">{isDragActive ? 'Drop your file here' : 'Drag & drop your CSV file'}</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">or click to browse</p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-[var(--color-muted-foreground)]">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[color:var(--color-success)]" /> CSV</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[color:var(--color-success)]" /> Auto-Process</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[color:var(--color-success)]" /> RAG Index</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-4">Preprocessing Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[var(--color-muted-foreground)] mb-1.5 block">Missing Values</label>
              <select value={config.impute_strategy} onChange={(e) => setConfig({ ...config, impute_strategy: e.target.value })}
                className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[color:var(--color-primary)] transition-colors">
                <option value="mean">Mean</option><option value="median">Median</option>
                <option value="mode">Mode</option><option value="drop">Drop Rows</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-muted-foreground)] mb-1.5 block">Normalize</label>
              <Button variant={config.normalize ? 'default' : 'outline'} size="default" className="w-full"
                onClick={() => setConfig({ ...config, normalize: !config.normalize })}>
                {config.normalize ? '✓ Enabled' : 'Disabled'}
              </Button>
            </div>
            <div>
              <label className="text-xs text-[var(--color-muted-foreground)] mb-1.5 block">Encode Categoricals</label>
              <Button variant={config.encode_categoricals ? 'default' : 'outline'} size="default" className="w-full"
                onClick={() => setConfig({ ...config, encode_categoricals: !config.encode_categoricals })}>
                {config.encode_categoricals ? '✓ Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { step: 1, title: 'Parse & Validate', icon: FileSpreadsheet },
          { step: 2, title: 'Preprocess', icon: Workflow },
          { step: 3, title: 'Embed Chunks', icon: Cpu },
          { step: 4, title: 'Index to VectorDB', icon: Database },
        ].map(({ step, title, icon: Icon }) => (
          <Card key={step} className="text-center p-4 group hover:border-[color:var(--color-primary)]/30 transition-all">
            <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-bold text-white mb-2 group-hover:scale-110 transition-transform"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary), var(--color-accent))' }}>
              {step}
            </div>
            <Icon className="w-4 h-4 mx-auto text-[var(--color-muted-foreground)] mb-1" />
            <p className="text-xs font-medium text-[var(--color-muted-foreground)]">{title}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
