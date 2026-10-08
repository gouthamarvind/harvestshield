import { motion } from 'framer-motion';
import { FileText, Wheat, CloudSun, ArrowRight, Clock } from 'lucide-react';
import { useApp, type ReportType } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { presetById } from '../data/scenarios';

const TYPES: { id: ReportType; title: string; desc: string; icon: typeof FileText; audience: string }[] = [
  { id: 'district', title: 'District Brief', desc: 'One-page risk summary, drivers and recommended interventions for the highest-risk district.', icon: FileText, audience: 'District Collector · Agriculture Dept' },
  { id: 'food', title: 'Food Security Brief', desc: 'Production at risk, supply exposure, reserve coverage and pre-positioning recommendations.', icon: Wheat, audience: 'Civil Supplies · NGOs' },
  { id: 'climate', title: 'Climate Risk Report', desc: 'ENSO status, analog years, seasonal outlook and statewide risk distribution.', icon: CloudSun, audience: 'Policy makers · Planning' },
];

export default function Reports() {
  const { setReportType, presetId } = useApp();
  return (
    <div>
      <PageHeader eyebrow="Reporting" title="Reports" subtitle="Generate decision-ready briefs from the current scenario in one click." />
      <div className="grid gap-4 md:grid-cols-3">
        {TYPES.map((t, i) => (
          <motion.button key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} onClick={() => setReportType(t.id)}
            className="panel panel-hover group p-5 text-left hover:-translate-y-0.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-mint/25 bg-mint/10"><t.icon className="h-5 w-5 text-mint" /></div>
            <div className="mt-4 text-[17px] font-semibold">Generate {t.title}</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-fog-400">{t.desc}</div>
            <div className="mt-4 text-[11.5px] text-fog-500">{t.audience}</div>
            <div className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-mint">Preview <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></div>
          </motion.button>
        ))}
      </div>
      <Panel className="mt-4" eyebrow="Recent" title="Report history">
        <ul className="divide-y divide-white/[0.05]">
          {[['Weekly climate risk summary', 'climate', '2 days ago'], ['Thanjavur district brief', 'district', '5 days ago'], ['Delta food security brief', 'food', '1 week ago']].map(([n, t, w]) => (
            <li key={n} className="flex items-center gap-3 py-3">
              <FileText className="h-4 w-4 text-fog-500" />
              <span className="flex-1 text-[13px]">{n}</span>
              <span className="flex items-center gap-1 text-[11.5px] text-fog-500"><Clock className="h-3 w-3" />{w}</span>
              <button className="btn-subtle h-8 text-[12px]" onClick={() => setReportType(t as ReportType)}>Regenerate · {presetById(presetId).short}</button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
