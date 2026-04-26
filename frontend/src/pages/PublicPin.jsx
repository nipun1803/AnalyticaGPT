import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Link as LinkIcon, ArrowLeft } from "lucide-react";

import { getPin } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function PublicPin({ pinId, onBack }) {
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pinId) return;
    getPin(pinId)
      .then((p) => setPin(p))
      .catch(() => toast.error("Pin not found"))
      .finally(() => setLoading(false));
  }, [pinId]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <LinkIcon className="w-4 h-4 text-[color:var(--color-accent)]" />
            Shared pin
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{loading ? "Loading…" : pin?.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && !pin && (
              <p className="text-sm text-[var(--color-muted-foreground)]">This pin is unavailable.</p>
            )}

            {pin?.content_type === "insight" && (
              <div className="prose-custom text-sm">
                <ReactMarkdown>{pin.content_data?.answer || ""}</ReactMarkdown>
              </div>
            )}

            {pin?.content_type === "chart" && (
              <pre className="text-xs whitespace-pre-wrap text-[var(--color-muted-foreground)]">
                {JSON.stringify(pin.content_data, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

