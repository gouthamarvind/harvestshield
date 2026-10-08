import { Database } from 'lucide-react';
import { Panel } from './ui/Panel';
import { Badge, type Tone } from './ui/Badge';
import { PROVENANCE, CONN_LABEL, MODEL_VERSION, type ConnStatus, type ProvType } from '../data/provenance';

const TYPE_LABEL: Record<ProvType, string> = { OBSERVED: 'Observed', FORECAST: 'Forecast', SCENARIO: 'Scenario', ILLUSTRATIVE: 'Illustrative', REFERENCE: 'Reference' };
const STATUS_TONE: Record<ConnStatus, Tone> = { CONNECTED: 'mint', HAND_ENTERED: 'amber', ASSUMED: 'amber', NOT_CONNECTED: 'neutral' };

export function ProvenancePanel() {
  const count = (s: ConnStatus) => PROVENANCE.filter((p) => p.status === s).length;
  return (
    <Panel eyebrow={<span className="flex items-center gap-1.5"><Database className="h-3 w-3" />Data provenance</span>} title="Where each number comes from" delay={0.05}
      actions={<span className="text-[11.5px] text-fog-500">Model {MODEL_VERSION}</span>}>
      <p className="mb-3 text-[12.5px] text-fog-400">
        {count('CONNECTED')} connected · {count('HAND_ENTERED')} hand-entered · {count('ASSUMED')} assumed · {count('NOT_CONNECTED')} not connected yet.
        Observed, forecast, scenario and illustrative figures are labelled separately throughout the app.
      </p>
      <div className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
        {PROVENANCE.map((p) => (
          <div key={p.id} className="grid gap-2 bg-white/[0.015] px-4 py-3 md:grid-cols-[1.3fr_1fr_1.2fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="text-[13px] font-medium">{p.name}</div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-fog-500">{p.note}</div>
            </div>
            <div className="text-[12px] text-fog-300">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-fog-500">{TYPE_LABEL[p.type]}</span>
              <div>{p.source}</div>
            </div>
            <div className="text-[11.5px] text-fog-400">
              {p.period && <div>Period: {p.period}</div>}
              {p.retrieved && <div>{p.id === 'outlook' ? 'Issued' : 'Retrieved'}: {p.retrieved}</div>}
              {p.url && <a className="text-cyan underline-offset-2 hover:underline" href={p.url} target="_blank" rel="noopener noreferrer">Source link</a>}
            </div>
            <div><Badge tone={STATUS_TONE[p.status]} dot>{CONN_LABEL[p.status]}</Badge></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
