/**
 * EDAPanel — Exploratory Data Analysis with detailed distributions.
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Info } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getEDA } from '../services/api';

export default function EDAPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEDA().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Exploratory Data Analysis</h2>
        <p className="text-zinc-500 text-sm">In-depth feature distribution and cardinality analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(data.distributions).map(([col, dist]) => (
          <Card key={col} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200">{col}</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{dist.type} distribution</p>
              </div>
              {data.cardinality[col] && (
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 uppercase">Unique Values</p>
                  <p className="font-mono text-orange-400">{data.cardinality[col]}</p>
                </div>
              )}
            </div>

            <div className="h-64 w-full">
              {dist.type === 'numeric' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dist.counts.map((c, i) => ({ count: c, bin: dist.bins[i].toFixed(2) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="bin" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                      itemStyle={{ color: '#a78bfa', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="url(#violetGradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={dist.labels.map((l, i) => ({ label: l, value: dist.values[i] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" stroke="#71717a" fontSize={10} width={80} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                      itemStyle={{ color: '#22d3ee', fontSize: '12px' }}
                    />
                    <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-orange-600/5 border-orange-500/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-orange-400 mt-0.5" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          The distributions above show the top 10 most frequent values for categorical columns and 10-bin histograms for numerical columns.
          Use this to identify skews, class imbalances, or potential outliers in your features.
        </p>
      </Card>
    </div>
  );
}
