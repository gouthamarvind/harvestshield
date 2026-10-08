import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

export interface SNode { id: string; label: string; col: number; color: string }
export interface SLink { source: string; target: string; value: number }

/** Minimal column Sankey (no dependency): node height ∝ max(in, out), links are cubic bands. */
export function Sankey({ nodes, links, height = 340, columns, format = (v) => v.toFixed(0) }: { nodes: SNode[]; links: SLink[]; height?: number; columns: string[]; format?: (v: number) => string }) {
  const [hover, setHover] = useState<string | null>(null);
  const W = 1000, padY = 14, nodeW = 12, top = 28;
  const layout = useMemo(() => {
    const val = (id: string) => Math.max(links.filter((l) => l.source === id).reduce((s, l) => s + l.value, 0), links.filter((l) => l.target === id).reduce((s, l) => s + l.value, 0));
    const cols = columns.map((_, c) => nodes.filter((n) => n.col === c));
    const maxTotal = Math.max(...cols.map((col) => col.reduce((s, n) => s + val(n.id), 0)));
    const maxCount = Math.max(...cols.map((c) => c.length));
    const k = (height - top - padY * (maxCount - 1) - 8) / Math.max(1e-6, maxTotal);
    const pos: Record<string, { x: number; y: number; h: number; v: number; outY: number; inY: number }> = {};
    cols.forEach((col, c) => {
      const total = col.reduce((s, n) => s + val(n.id) * k, 0) + padY * (col.length - 1);
      let y = top + (height - top - total) / 2;
      const x = (c / (columns.length - 1)) * (W - nodeW);
      col.forEach((n) => { const h = Math.max(2, val(n.id) * k); pos[n.id] = { x, y, h, v: val(n.id), outY: y, inY: y }; y += h + padY; });
    });
    const paths = links.filter((l) => l.value > 0).map((l) => {
      const s = pos[l.source], t = pos[l.target];
      const w = l.value * k;
      const y0 = s.outY + w / 2, y1 = t.inY + w / 2;
      s.outY += w; t.inY += w;
      const x0 = s.x + nodeW, x1 = t.x, xm = (x0 + x1) / 2;
      return { ...l, w, d: `M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1}` };
    });
    return { pos, paths };
  }, [nodes, links, columns, height]);
  const color = (id: string) => nodes.find((n) => n.id === id)!.color;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Impact flow from climate to population exposure">
      <defs>
        {layout.paths.map((p, i) => (
          <linearGradient key={i} id={`sk-${i}`} x1="0" x2="1"><stop offset="0" stopColor={color(p.source)} stopOpacity={0.7} /><stop offset="1" stopColor={color(p.target)} stopOpacity={0.7} /></linearGradient>
        ))}
      </defs>
      {columns.map((c, i) => <text key={c} x={(i / (columns.length - 1)) * (W - nodeW) + (i === columns.length - 1 ? nodeW : 0)} y={12} textAnchor={i === 0 ? 'start' : i === columns.length - 1 ? 'end' : 'middle'} style={{ fontSize: 11, letterSpacing: '0.14em', fill: '#5B7266', fontWeight: 600 }}>{c.toUpperCase()}</text>)}
      {layout.paths.map((p, i) => {
        const dim = hover && hover !== p.source && hover !== p.target;
        return (
          <motion.path key={i} d={p.d} fill="none" stroke={`url(#sk-${i})`} strokeWidth={Math.max(1, p.w)} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: dim ? 0.08 : hover ? 0.9 : 0.5 }} transition={{ duration: 0.9, delay: 0.1 + i * 0.03 }}>
            <title>{`${nodes.find((n) => n.id === p.source)!.label} → ${nodes.find((n) => n.id === p.target)!.label}: ${format(p.value)}`}</title>
          </motion.path>
        );
      })}
      {nodes.map((n) => {
        const p = layout.pos[n.id];
        if (!p) return null;
        const last = n.col === columns.length - 1;
        return (
          <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} className="cursor-default">
            <rect x={p.x} y={p.y} width={nodeW} height={p.h} rx={3} fill={n.color} style={{ filter: `drop-shadow(0 0 6px ${n.color})` }} />
            <text x={last ? p.x - 8 : p.x + nodeW + 8} y={p.y + p.h / 2} dominantBaseline="middle" textAnchor={last ? 'end' : 'start'} style={{ fontSize: 12.5, fill: '#E8F3EC', fontWeight: 500, paintOrder: 'stroke', stroke: 'rgba(8,24,18,0.85)', strokeWidth: 5, strokeLinejoin: 'round' }}>
              {n.label} <tspan dx={4} style={{ fill: '#A9BFB2', fontSize: 11, fontWeight: 400 }}>{format(p.v)}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
