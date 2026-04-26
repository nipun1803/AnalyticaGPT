/**
 * ChatBox — RAG chat with Lucide icons, shadcn Cards, streaming, role selector.
 */

import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Trash2, ChevronDown, Zap, BarChart3, Briefcase, Crown, Sparkles, Pin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { createPin, queryDataset, queryStream, getChatHistory, clearChatHistory } from '../services/api';

const ROLES = [
  { value: 'analyst', label: 'Analyst', icon: BarChart3, desc: 'Technical, statistical' },
  { value: 'manager', label: 'Manager', icon: Briefcase, desc: 'Actionable, operational' },
  { value: 'ceo', label: 'CEO', icon: Crown, desc: 'Strategic, high-level' },
];

const EXAMPLES = [
  'What are the key insights from this dataset?',
  'Which columns have the strongest correlations?',
  'Summarize the distribution of numeric columns',
  'What business recommendations would you make?',
];

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('analyst');
  const [streaming, setStreaming] = useState(true);
  const [showRoles, setShowRoles] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    getChatHistory().then((h) => {
      if (h.length) setMessages(h.flatMap((x) => [
        { type: 'user', content: x.query, role: x.role },
        { type: 'assistant', content: x.answer, sources: x.sources_count },
      ]));
    }).catch(() => {});
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim(); setInput(''); setLoading(true);
    setMessages((p) => [...p, { type: 'user', content: q, role }]);

    if (streaming) {
      let buf = '';
      setMessages((p) => [...p, { type: 'assistant', content: '', streaming: true }]);
      queryStream(q, { role }, (tok) => {
        buf += tok;
        setMessages((p) => { const u = [...p]; u[u.length - 1] = { type: 'assistant', content: buf, streaming: true }; return u; });
      }, () => {
        setMessages((p) => { const u = [...p]; u[u.length - 1] = { ...u[u.length - 1], streaming: false }; return u; });
        setLoading(false);
      }, () => { toast.error('Streaming failed'); setLoading(false); });
    } else {
      try {
        const res = await queryDataset(q, { role });
        setMessages((p) => [...p, { type: 'assistant', content: res.answer, sources: res.sources?.length || 0, sourcesData: res.sources || [], showSources: false }]);
      } catch (err) { toast.error(err.response?.data?.detail || 'Query failed'); setMessages((p) => [...p, { type: 'error', content: 'Failed to get response.' }]); }
      finally { setLoading(false); }
    }
  };

  const curRole = ROLES.find((r) => r.value === role);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-foreground)]">RAG Chat</h2>
          <p className="text-[var(--color-muted-foreground)] text-sm">Query your data with natural language</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={streaming ? 'default' : 'outline'} size="sm" onClick={() => setStreaming(!streaming)}>
            <Zap className="w-3.5 h-3.5" /> {streaming ? 'Stream' : 'Batch'}
          </Button>
          <div className="relative">
            <Button variant="secondary" size="sm" onClick={() => setShowRoles(!showRoles)}>
              {curRole && <curRole.icon className="w-3.5 h-3.5" />} {curRole?.label} <ChevronDown className="w-3 h-3" />
            </Button>
            {showRoles && (
              <Card className="absolute right-0 mt-2 w-52 z-50 p-1">
                {ROLES.map((r) => (
                  <button key={r.value} onClick={() => { setRole(r.value); setShowRoles(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${role === r.value ? 'bg-[color:var(--color-primary)]/12 text-[color:var(--color-primary)]' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]'}`}>
                    <r.icon className="w-4 h-4" /><div><p className="font-medium text-xs">{r.label}</p><p className="text-[10px] text-[var(--color-muted-foreground)]">{r.desc}</p></div>
                  </button>
                ))}
              </Card>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={async () => { await clearChatHistory(); setMessages([]); toast.success('Cleared'); }}>
            <Trash2 className="w-4 h-4 text-[var(--color-muted-foreground)] hover:text-[color:var(--color-danger)]" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-12 h-12 text-[var(--color-muted-foreground)] mb-3" />
            <p className="text-[var(--color-muted-foreground)] mb-5 text-sm">Ask anything about your data</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
              {EXAMPLES.map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-left px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[color:var(--color-primary)]/30 transition-all bg-[var(--color-card)]">
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm relative ${
              msg.type === 'user' ? 'bg-[color:var(--color-primary)] text-white'
              : msg.type === 'error' ? 'bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/20 text-[color:var(--color-danger)]'
              : 'bg-[color:var(--color-card)] border border-[color:var(--color-border)] text-[color:var(--color-foreground)]'
            }`}>
              {msg.type === 'user' ? (
                <p>{msg.content}</p>
              ) : (
                <div className="prose-custom text-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {msg.streaming && <span className="inline-block w-1.5 h-4 bg-[color:var(--color-accent)] animate-pulse ml-0.5 rounded-sm" />}
                  {msg.sources > 0 && <p className="text-[10px] text-zinc-600 mt-2">📎 {msg.sources} sources</p>}

                  {Array.isArray(msg.sourcesData) && msg.sourcesData.length > 0 && (
                    <div className="mt-3">
                      <button
                        className="text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] underline-offset-4 hover:underline"
                        onClick={() =>
                          setMessages((p) => {
                            const u = [...p];
                            u[i] = { ...u[i], showSources: !u[i].showSources };
                            return u;
                          })
                        }
                      >
                        {msg.showSources ? "Hide sources" : "Show sources"}
                      </button>

                      {msg.showSources && (
                        <div className="mt-2 space-y-2">
                          {msg.sourcesData.map((s, idx) => (
                            <div key={s.id || idx} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                              <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                                {(s.type || "source")} • relevance {typeof s.relevance === "number" ? s.relevance.toFixed(3) : s.relevance}
                              </p>
                              <p className="text-xs text-[var(--color-muted-foreground)] mt-1 leading-relaxed whitespace-pre-wrap">
                                {s.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {msg.type === 'assistant' && !msg.streaming && msg.content?.trim() && (
                <button
                  className="absolute top-2 right-2 p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                  title="Pin this answer"
                  onClick={async () => {
                    try {
                      const title = (messages[i - 1]?.content || "Pinned answer").slice(0, 80);
                      const pin = await createPin(title, "insight", { question: messages[i - 1]?.content, answer: msg.content });
                      const url = `${window.location.origin}/?pin=${pin.id}`;
                      await navigator.clipboard.writeText(url);
                      toast.success("Pinned. Link copied.");
                    } catch (e) {
                      toast.error(e.response?.data?.detail || "Failed to pin");
                    }
                  }}
                >
                  <Pin className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2.5 pt-4 border-t border-[var(--color-border)]">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask anything about your data..." disabled={loading} className="flex-1" />
        <Button onClick={send} disabled={loading || !input.trim()} loading={loading}>
          <SendHorizonal className="w-4 h-4" /> Send
        </Button>
      </div>
    </div>
  );
}
