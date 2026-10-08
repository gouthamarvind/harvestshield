import { motion } from 'framer-motion';
import { Lightbulb, Clock, Database, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../state/AppState';
import { PageHeader } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { timeAgo } from '../lib/format';
import { useToast } from '../state/toast';
import { cn } from '../lib/cn';

export default function Insights() {
  const { insights } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(insights[0]?.id ?? null);
  const [voted, setVoted] = useState<Record<string, 'up' | 'down'>>({});
  return (
    <div>
      <PageHeader eyebrow="Analyst insights" title="Insights" subtitle="Auto-generated observations derived from model outputs. Each insight states its confidence and source type — these are prompts for expert review, not scientific findings." />
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber/20 bg-amber/[0.05] px-4 py-3 text-[12.5px] text-fog-300">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
        Insights are templated from computed scenario values (rule-based narrative), not free-form AI generation. Confidence reflects model coverage and assumption strength, and should be validated by domain experts before action.
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {insights.map((ins, i) => {
          const isOpen = open === ins.id;
          return (
            <motion.div key={ins.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="panel panel-hover p-5">
              <div className="flex items-center gap-2"><Badge tone="cyan">{ins.tag}</Badge><span className="ml-auto flex items-center gap-1 text-[11px] text-fog-500"><Clock className="h-3 w-3" />{timeAgo(ins.minutesAgo)}</span></div>
              <h3 className="mt-3 text-[16px] font-semibold leading-snug">{ins.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-fog-400">{ins.body}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px]"><span className="text-fog-500">Confidence</span><span className="num font-mono text-fog-300">{Math.round(ins.confidence * 100)}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><motion.div className="h-full rounded-full" style={{ background: ins.confidence > 0.7 ? '#3DF58A' : ins.confidence > 0.6 ? '#C6F432' : '#F5B83D' }} initial={{ width: 0 }} animate={{ width: `${ins.confidence * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }} /></div>
              </div>
              <button onClick={() => setOpen(isOpen ? null : ins.id)} className="mt-4 flex w-full items-center justify-between border-t border-white/[0.05] pt-3 text-[12px] text-fog-400 hover:text-fog-100" aria-expanded={isOpen}>
                <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" />Source: {ins.source}</span><ChevronDown className={cn('h-4 w-4 transition', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="mt-3 text-[12px] leading-relaxed text-fog-500">Derived from the active scenario through deterministic rules over district risk, exposure and optimiser outputs. Production would attach observation provenance (dataset, date, resolution) and a reviewer sign-off.</div>
                  <div className="mt-3 flex items-center gap-2 text-[12px]">
                    <span className="text-fog-500">Useful?</span>
                    {(['up', 'down'] as const).map((v) => {
                      const I = v === 'up' ? ThumbsUp : ThumbsDown;
                      return <button key={v} aria-label={v === 'up' ? 'Helpful' : 'Not helpful'} onClick={() => { setVoted((s) => ({ ...s, [ins.id]: v })); toast({ tone: 'success', title: 'Feedback recorded', body: 'Used to tune insight rules.' }); }} className={cn('rounded-md border p-1.5', voted[ins.id] === v ? 'border-mint/40 text-mint' : 'border-white/10 text-fog-500 hover:text-fog-100')}><I className="h-3.5 w-3.5" /></button>;
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
