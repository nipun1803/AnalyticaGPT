import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Database, Trash2 } from "lucide-react";

import { activateDataset, deleteDataset, listDatasets } from "../services/api";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

export default function DatasetSwitcher({ collapsed, datasetLoaded, onActivated }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const active = useMemo(() => datasets.find((d) => d.active), [datasets]);

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await listDatasets();
      setDatasets(rows || []);
    } catch {
      // ignore (user may not have any yet)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
    });
  }, [datasetLoaded]);

  const onChange = async (e) => {
    const id = e.target.value;
    if (!id) return;
    setSwitching(true);
    try {
      const info = await activateDataset(id);
      toast.success(`Switched to ${info.filename}`);
      await refresh();
      onActivated?.(info);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to activate dataset");
    } finally {
      setSwitching(false);
    }
  };

  const onDelete = async () => {
    if (!active?.dataset_id) return;
    if (!confirm(`Delete dataset "${active.filename}"?`)) return;
    try {
      await deleteDataset(active.dataset_id);
      toast.success("Dataset deleted");
      await refresh();
      onActivated?.(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete dataset");
    }
  };

  if (collapsed) return null;

  return (
    <div className="px-3 pb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          <Database className="w-3.5 h-3.5" />
          Datasets
        </div>
        {!!active && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={switching}
            className="h-7 w-7"
            title="Delete active dataset"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <select
        value={active?.dataset_id || ""}
        onChange={onChange}
        disabled={loading || switching || datasets.length === 0}
        className={cn(
          "w-full rounded-xl px-3 py-2 text-xs border",
          "bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)]",
          "focus:outline-none focus:border-[color:var(--color-primary)]",
          "disabled:opacity-60"
        )}
      >
        {datasets.length === 0 ? (
          <option value="">{loading ? "Loading…" : "No saved datasets yet"}</option>
        ) : (
          datasets.map((d) => (
            <option key={d.dataset_id} value={d.dataset_id}>
              {d.active ? "• " : ""}
              {d.filename} ({d.rows} rows)
            </option>
          ))
        )}
      </select>
    </div>
  );
}

