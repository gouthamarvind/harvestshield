import { FlaskConical, Droplets, Wheat, TrendingDown, Sprout, Users, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useApp } from '../state/AppState';
import { Drawer } from './ui/Overlay';
import { districtById } from '../data/districts';
import { districtRisk } from '../services/cropRiskService';
import { INTERVENTIONS, interventionEffect } from '../services/interventionService';
import { RiskRing } from './ui/RiskRing';
import { RiskBadge, LevelBadge } from './ui/Badge';
import { FactorBars } from './ui/FactorBars';
import { CROPS, CROP_IDS } from '../data/crops';
import { riskBand } from '../lib/risk';
import { signalLevel } from '../services/foodSecurityService';
import { fmtInt } from '../lib/format';

export function DistrictDrawer() {
  const { drawerDistrict, openDistrict, params, simulateDistrict, risks } = useApp();
  const d = drawerDistrict ? districtById(drawerDistrict) : undefined;
  const r = useMemo(() => (d ? districtRisk(params, d) : null), [d, params]);
  const rank = r ? risks.findIndex((x) => x.district.id === r.district.id) + 1 : 0;
  const best = useMemo(() => {
    if (!d || !r) return null;
    return INTERVENTIONS.filter((i) => i.id !== 'switch' && i.id !== 'reserves')
      .map((i) => ({ i, e: interventionEffect(params, d, r.primary, d.monitoredHa, i.id) }))
      .sort((a, b) => b.e.riskReduction - a.e.riskReduction)[0];
  }, [d, r, params]);

  return (
    <Drawer open={!!d} onClose={() => openDistrict(null)} title={d?.name} width={470}>
      {d && r && (
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="border-b border-white/[0.06] px-6 pb-5 pt-6">
            <div className="eyebrow">District · Rank #{rank} of 37</div>
            <h2 className="mt-1 text-[24px] font-semibold tracking-tight">{d.name}</h2>
            <div className="mt-1 text-[12.5px] text-fog-400">{d.driver}</div>
            <div className="mt-5 flex items-center gap-5">
              <RiskRing value={r.score} size={132} sublabel={riskBand(r.score)} />
              <div className="grid flex-1 grid-cols-1 gap-2.5 text-[12.5px]">
                <Row icon={<Sprout className="h-3.5 w-3.5" />} label="Main crop" value={`${CROPS[r.primary].name} · ${(d.mix[r.primary] * 100).toFixed(0)}%`} />
                <Row icon={<TrendingDown className="h-3.5 w-3.5" />} label="Expected yield" value={<span className={r.yieldChange < -10 ? 'text-ember' : 'text-fog-100'}>{r.yieldChange.toFixed(1)}%</span>} />
                <Row icon={<Droplets className="h-3.5 w-3.5" />} label="Water availability" value={`${r.waterAvailability.toFixed(0)}%`} />
                <Row icon={<Wheat className="h-3.5 w-3.5" />} label="Food-security exposure" value={<LevelBadge level={signalLevel(r.foodExposure)} />} />
                <Row icon={<Users className="h-3.5 w-3.5" />} label="Population" value={`${fmtInt(d.populationLakh * 1e5)}`} />
              </div>
            </div>
          </div>
          <div className="space-y-6 px-6 py-5">
            <section>
              <div className="eyebrow mb-2">Crop mix (modelled area)</div>
              <div className="flex h-2.5 overflow-hidden rounded-full">
                {CROP_IDS.map((c) => <div key={c} style={{ width: `${d.mix[c] * 100}%`, background: CROPS[c].color }} title={`${CROPS[c].name} ${(d.mix[c] * 100).toFixed(0)}%`} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fog-400">
                {CROP_IDS.filter((c) => d.mix[c] > 0.02).map((c) => <span key={c} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: CROPS[c].color }} />{CROPS[c].name} {(d.mix[c] * 100).toFixed(0)}%</span>)}
              </div>
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between"><div className="eyebrow">Top risk factors</div><RiskBadge score={r.score} /></div>
              <FactorBars factors={r.factors.slice(0, 5)} compact />
            </section>
            {best && (
              <section className="rounded-xl border border-mint/20 bg-mint/[0.05] p-4">
                <div className="eyebrow text-mint/80">Recommended intervention</div>
                <div className="mt-1.5 text-[15px] font-semibold">{best.i.short}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-fog-400">{best.i.description}</div>
                <div className="mt-3 flex gap-4 text-[12px]">
                  <span><span className="num font-mono text-mint">−{best.e.riskReduction.toFixed(0)} pts</span> <span className="text-fog-500">risk</span></span>
                  <span><span className="num font-mono text-cyan">{best.e.waterSavingPct > 0 ? '−' : ''}{Math.abs(best.e.waterSavingPct).toFixed(0)}%</span> <span className="text-fog-500">water</span></span>
                  <span className="text-fog-500">Confidence {(best.i.confidence * 100).toFixed(0)}%</span>
                </div>
              </section>
            )}
          </div>
          <div className="sticky bottom-0 mt-auto border-t border-white/[0.06] bg-ink-900/90 p-4 backdrop-blur">
            <button className="btn-primary h-11 w-full text-[14px]" onClick={() => simulateDistrict(d.id)}>
              <FlaskConical className="h-4 w-4" /> Simulate this district <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-1.5 text-fog-500">{icon}{label}</span>
      <span className="num text-right font-medium text-fog-100">{value}</span>
    </div>
  );
}
