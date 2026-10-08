import { motion } from 'framer-motion';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { DISTRICT_SHAPES, MAP_VIEWBOX } from '../../data/tnGeo';
import { heatColor } from '../../lib/risk';

export type MapPalette = Parameters<typeof heatColor>[1];

interface Props {
  values: Record<string, number>;
  palette?: MapPalette;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  tooltip?: (id: string) => ReactNode;
  pulseIds?: string[];
  labelIds?: string[];
  className?: string;
  interactive?: boolean;
}

/** Choropleth of Tamil Nadu districts rendered from pre-projected SVG paths (no tile server needed). */
export function TamilNaduMap({ values, palette = 'risk', selectedId, onSelect, tooltip, pulseIds = [], labelIds = [], className, interactive = true }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const shapes = useMemo(() => [...DISTRICT_SHAPES].sort((a, b) => (a.id === selectedId ? 1 : b.id === selectedId ? -1 : 0)), [selectedId]);
  const byId = useMemo(() => Object.fromEntries(DISTRICT_SHAPES.map((s) => [s.id, s])), []);
  // Greedy label placement: skip labels that would collide with an already-placed one.
  const labels = useMemo(() => {
    const placed: { x: number; y: number }[] = [];
    return labelIds.filter((id) => {
      const s = byId[id];
      if (!s || placed.some((p) => Math.abs(p.x - s.cx) < 70 && Math.abs(p.y - s.cy) < 16)) return false;
      placed.push({ x: s.cx, y: s.cy });
      return true;
    });
  }, [labelIds, byId]);

  return (
    <div ref={wrap} className={`relative h-full w-full ${className ?? ''}`}
      onMouseMove={(e) => { const r = wrap.current!.getBoundingClientRect(); setPos({ x: e.clientX - r.left, y: e.clientY - r.top }); }}>
      <svg viewBox={MAP_VIEWBOX} className="h-full w-full" role="img" aria-label="Tamil Nadu district map">
        <defs>
          <filter id="tn-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="tn-sel" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#3DF58A" floodOpacity="0.9" /></filter>
          <radialGradient id="tn-light" cx="55%" cy="45%" r="60%"><stop offset="0" stopColor="#3DF58A" stopOpacity="0.07" /><stop offset="1" stopColor="#3DF58A" stopOpacity="0" /></radialGradient>
          <pattern id="tn-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(160,255,200,0.045)" strokeWidth="1" /></pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tn-grid)" />
        <rect width="100%" height="100%" fill="url(#tn-light)" />
        {/* coastline halo */}
        <g filter="url(#tn-glow)" opacity="0.55">
          {DISTRICT_SHAPES.map((s) => <path key={s.id} d={s.d} fill="none" stroke="rgba(61,245,138,0.22)" strokeWidth={3} />)}
        </g>
        <g>
          {shapes.map((s, i) => {
            const v = values[s.id] ?? 0;
            const sel = s.id === selectedId;
            const hov = s.id === hover;
            return (
              <motion.path key={s.id} d={s.d}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + (i % 37) * 0.012, duration: 0.4 }}
                style={{ fill: heatColor(v, palette), fillOpacity: sel ? 0.95 : hov ? 0.9 : 0.72, transition: 'fill .6s ease, fill-opacity .2s' }}
                stroke={sel ? '#E8FFF1' : hov ? 'rgba(232,255,241,0.8)' : 'rgba(6,17,13,0.85)'} strokeWidth={sel ? 1.8 : hov ? 1.2 : 0.8}
                filter={sel ? 'url(#tn-sel)' : undefined}
                className={interactive ? 'cursor-pointer' : ''}
                onMouseEnter={() => interactive && setHover(s.id)} onMouseLeave={() => setHover((h) => (h === s.id ? null : h))}
                onClick={() => interactive && onSelect?.(s.id)}
                tabIndex={interactive ? 0 : -1} role={interactive ? 'button' : undefined} aria-label={s.name}
                onKeyDown={(e) => { if (e.key === 'Enter' && interactive) onSelect?.(s.id); }} />
            );
          })}
        </g>
        {pulseIds.map((id) => byId[id] && (
          <g key={id} pointerEvents="none">
            <circle cx={byId[id].cx} cy={byId[id].cy} r={7} fill="none" stroke="#FF4D5E" strokeWidth={1.5} className="pulse-ring" />
            <circle cx={byId[id].cx} cy={byId[id].cy} r={3} fill="#FF4D5E" stroke="#06110D" strokeWidth={1} />
          </g>
        ))}
        {labels.map((id) => (
          <text key={id} x={byId[id].cx} y={byId[id].cy - 10} textAnchor="middle" pointerEvents="none" className="select-none" style={{ fontSize: 10.5, fontWeight: 600, fill: '#E8F3EC', paintOrder: 'stroke', stroke: '#06110D', strokeWidth: 3 }}>{byId[id].name}</text>
        ))}
      </svg>
      {interactive && hover && tooltip && (
        <div className="glass pointer-events-none absolute z-20 min-w-[180px] rounded-lg px-3 py-2 text-[12px] shadow-2xl shadow-black/60"
          style={{ left: Math.min(pos.x + 14, (wrap.current?.clientWidth ?? 400) - 200), top: Math.max(8, pos.y - 10) }}>
          {tooltip(hover)}
        </div>
      )}
    </div>
  );
}

export function MapLegend({ palette, label, min = 'Low', max = 'High' }: { palette: MapPalette; label: string; min?: string; max?: string }) {
  const stops = Array.from({ length: 11 }, (_, i) => heatColor(i * 10, palette)).join(',');
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="h-2 w-48 rounded-full" style={{ background: `linear-gradient(90deg, ${stops})` }} />
      <div className="mt-1 flex w-48 justify-between text-[10.5px] text-fog-500"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}
