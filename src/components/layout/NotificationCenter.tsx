import { motion } from 'framer-motion';
import { CheckCheck, ArrowRight } from 'lucide-react';
import { useApp } from '../../state/AppState';
import { levelColor } from '../ui/Badge';
import { timeAgo } from '../../lib/format';

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { alerts, reviewed, markReviewed, navigate } = useApp();
  const list = alerts.slice(0, 6);
  return (
    <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15 }}
      className="glass absolute right-0 top-11 z-50 w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="text-[13px] font-semibold">Notifications</div>
        <button className="flex items-center gap-1 text-[11.5px] text-fog-400 hover:text-mint" onClick={() => list.forEach((a) => markReviewed(a.id))}><CheckCheck className="h-3.5 w-3.5" />Mark all reviewed</button>
      </div>
      <ul className="max-h-[360px] overflow-y-auto">
        {list.map((a) => {
          const done = reviewed.has(a.id);
          return (
            <li key={a.id} className={`flex gap-3 border-b border-white/[0.04] px-4 py-3 transition hover:bg-white/[0.03] ${done ? 'opacity-50' : ''}`}>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: levelColor(a.severity), boxShadow: `0 0 8px ${levelColor(a.severity)}` }} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium leading-snug text-fog-100">{a.title}</div>
                <div className="mt-0.5 text-[11px] text-fog-500">{a.category} · {a.location} · {timeAgo(a.minutesAgo)}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <button onClick={() => { navigate('alerts'); onClose(); }} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium text-mint hover:bg-white/[0.03]">Open Alert Center <ArrowRight className="h-3.5 w-3.5" /></button>
    </motion.div>
  );
}
