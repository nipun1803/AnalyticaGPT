import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Link as LinkIcon } from "lucide-react";

import { listPins } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function Pins() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = useMemo(() => window.location.origin, []);

  useEffect(() => {
    listPins()
      .then((rows) => setPins(rows || []))
      .catch(() => toast.error("Failed to load pins"))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = async (id) => {
    const url = `${baseUrl}/?pin=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Shared Pins</h2>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-0.5">Share insights and charts with a public link</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-[color:var(--color-accent)]" />
            Your Pins
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>
          ) : pins.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No pins yet. Pin a chat answer or insight to generate a share link.</p>
          ) : (
            pins.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-card)]">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{p.title}</p>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider mt-0.5">
                    {p.content_type} • {new Date(p.created_at).toLocaleString()}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => copyLink(p.id)}>
                  <Copy className="w-4 h-4" /> Copy link
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

