import { useEffect, useState } from 'react';
import { ClipboardCopy, FileText } from 'lucide-react';
import { useApp } from '../state/AppState';
import { Modal } from './ui/Overlay';
import { Skeleton } from './ui/Skeleton';
import { presetById, ensoLabel } from '../data/scenarios';
import { analogSimilarity } from '../services/climateService';
import { INTERVENTIONS, interventionEffect } from '../services/interventionService';
import { CROPS } from '../data/crops';
import { fmtInt, fmtSigned } from '../lib/format';
import { riskBand, riskColor } from '../lib/risk';
import { useToast } from '../state/toast';
import { FactorBars } from './ui/FactorBars';
import { Logo } from './layout/Logo';

const TITLES = { district: 'District Brief', food: 'Food Security Brief', climate: 'Climate Risk Report' } as const;

export function ReportModal() {
  const { reportType, setReportType, params, presetId, risks, food, summary } = useApp();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!reportType) return; setLoading(true); const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }, [reportType, presetId]);
  const top = risks[0];
  const analog = analogSimilarity(params)[0];
  const effects = INTERVENTIONS.filter((i) => i.id !== 'switch').map((i) => ({ i, e: interventionEffect(params, top.district, top.primary, top.district.monitoredHa, i.id) })).sort((a, b) => b.e.riskReduction + b.e.foodExposureReduction * 0.5 - (a.e.riskReduction + a.e.foodExposureReduction * 0.5)).slice(0, 3);
  const date = new Date('2026-10-08').toLocaleDateString('en-IN', { dateStyle: 'long' });
  const title = reportType ? TITLES[reportType] : '';

  return (
    <Modal open={!!reportType} onClose={() => setReportType(null)} title={title} className="max-w-3xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-2 text-[13px] font-medium"><FileText className="h-4 w-4 text-mint" />Preview · {title}</div>
        <div className="mr-8 flex gap-2">
          <button className="btn-ghost h-8 text-[12px]" disabled={loading} onClick={() => { const el = document.getElementById('report-body'); navigator.clipboard?.writeText(el?.innerText ?? '').then(() => toast({ tone: 'success', title: 'Report text copied' }), () => toast({ tone: 'warning', title: 'Clipboard unavailable' })); }}><ClipboardCopy className="h-3.5 w-3.5" />Copy</button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /><div className="grid grid-cols-3 gap-3 pt-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div><Skeleton className="h-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><div className="pt-2 text-center text-[12px] text-fog-500">Compiling from scenario model…</div></div>
        ) : (
          <article id="report-body" className="rounded-xl bg-[#F4F8F5] p-8 text-[#0C1E15] shadow-inner">
            <header className="flex items-start justify-between border-b border-[#0C1E15]/10 pb-4">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#1A7F4B]">HarvestShield · {title}</div>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight">{reportType === 'district' ? `${top.district.name} district: El Niño crop-risk brief` : reportType === 'food' ? 'Tamil Nadu early food-security signal' : 'El Niño climate risk outlook — Tamil Nadu'}</h2>
                <div className="mt-1 text-[12px] text-[#3F5449]">{date} · Scenario: {presetById(presetId).name}</div>
              </div>
              <Logo size={36} />
            </header>
            {reportType === 'district' && (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Fig k="Crop risk" v={`${top.score.toFixed(0)}%`} s={riskBand(top.score)} c={riskColor(top.score)} />
                  <Fig k="Yield change" v={`${top.yieldChange.toFixed(1)}%`} s={`${CROPS[top.primary].name}-dominant`} />
                  <Fig k="Water stress" v={`${top.waterStress.toFixed(0)}/100`} s={`storage ${params.water}%`} />
                </div>
                <H>Summary</H>
                <P>{top.district.name} ({top.district.driver.toLowerCase()}) is the highest-risk district under the {presetById(presetId).name} scenario. Modelled crop risk of {top.score.toFixed(0)}% is driven primarily by {top.factors.slice(0, 2).map((f) => f.label.toLowerCase()).join(' and ')}.</P>
                <H>Risk drivers</H>
                <div className="rounded-lg bg-[#0C1E15] p-4"><FactorBars factors={top.factors.slice(0, 5)} compact /></div>
                <H>Recommended interventions</H>
                <ol className="list-decimal space-y-1.5 pl-5 text-[13px]">{effects.map(({ i, e }) => <li key={i.id}><b>{i.name}</b> — risk {e.riskReduction > 0.5 ? `−${e.riskReduction.toFixed(0)} pts` : 'unchanged'}, food exposure {e.foodExposureReduction > 0.5 ? `−${e.foodExposureReduction.toFixed(0)}` : 'unchanged'}; act within {i.urgencyDays} days ({i.owner}).</li>)}</ol>
              </>
            )}
            {reportType === 'food' && (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Fig k="Signal" v={food.level} s={`index ${food.index.toFixed(0)}/100`} />
                  <Fig k="Production at risk" v={`${fmtInt(food.productionLossT)} t`} s="pilot network" />
                  <Fig k="Reserve coverage" v={`${food.reserveDays} days`} s={`~${fmtInt(food.vulnerablePopulation)} vulnerable`} />
                </div>
                <H>Assessment</H>
                <P>Projected production decline corresponds to ~{food.supplyExposurePct.toFixed(1)}% local staple-supply exposure. Highest population-weighted exposure: {food.supplyDemand.slice(0, 3).map((s) => s.district).join(', ')}.</P>
                <H>Recommended actions</H>
                <ol className="list-decimal space-y-1.5 pl-5 text-[13px]"><li><b>Pre-position PDS reserves</b> in exposed blocks before the lean season.</li><li><b>Diversify rice acreage</b> in delta districts to stabilise staple output.</li><li><b>Prioritise irrigation</b> for critical crop stages via protected allocation.</li></ol>
              </>
            )}
            {reportType === 'climate' && (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Fig k="ENSO" v={`${params.enso.toFixed(1)}°C`} s={ensoLabel(params.enso)} />
                  <Fig k="Rainfall" v={fmtSigned(params.rainfall, 0, '%')} s={`temp ${fmtSigned(params.temperature, 1, '°C')}`} />
                  <Fig k="Critical districts" v={String(summary.criticalDistricts)} s={`crop risk ${summary.cropRisk.toFixed(0)}%`} />
                </div>
                <H>Outlook</H>
                <P>The current ENSO trajectory most closely resembles {analog.analog.label} (similarity {analog.similarity.toFixed(0)}%), when impacts included: {analog.analog.impact.toLowerCase()}. Statewide monitored-area crop risk stands at {summary.cropRisk.toFixed(0)}% with ~{summary.preventableRisk.toFixed(0)}% considered preventable through feasible interventions.</P>
                <H>Highest-risk districts</H>
                <table className="w-full text-[12.5px]"><tbody>{risks.slice(0, 6).map((r) => <tr key={r.district.id} className="border-b border-[#0C1E15]/10"><td className="py-1.5">{r.district.name}</td><td>{r.cropLabel}</td><td className="text-right font-mono" style={{ color: riskColor(r.score) }}>{r.score.toFixed(0)}%</td></tr>)}</tbody></table>
              </>
            )}
            <footer className="mt-6 border-t border-[#0C1E15]/10 pt-3 text-[10.5px] leading-relaxed text-[#5B7266]">Prototype scenario — values are illustrative. Production deployment would use ENSO observations, seasonal forecasts, historical crop yield data, water availability, soil/geospatial data and validated agronomic models.</footer>
          </article>
        )}
      </div>
    </Modal>
  );
}
const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1A7F4B]">{children}</h3>;
const P = ({ children }: { children: React.ReactNode }) => <p className="text-[13px] leading-relaxed text-[#12291E]">{children}</p>;
const Fig = ({ k, v, s, c }: { k: string; v: string; s: string; c?: string }) => (
  <div className="rounded-lg border border-[#0C1E15]/10 bg-white p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7266]">{k}</div><div className="mt-1 text-[20px] font-semibold" style={{ color: c }}>{v}</div><div className="text-[11px] text-[#5B7266]">{s}</div></div>
);
