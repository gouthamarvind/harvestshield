import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { PRESETS, presetById, type PresetId, type ScenarioParams } from '../data/scenarios';
import { districtById } from '../data/districts';
import type { CropId } from '../data/crops';
import { allDistrictRisks, stateSummary, type DistrictRisk, type StateSummary } from '../services/cropRiskService';
import { getFoodSecurity, type FoodSecurity } from '../services/foodSecurityService';
import { preventableRisk, type InterventionId } from '../services/interventionService';
import { getAlerts, getInsights, type Alert, type Insight } from '../services/intelligenceService';
import type { TimeRange } from '../services/climateService';
import type { Objective } from '../model/plan';
import { primaryCrop } from '../data/districts';
import type { RouteId } from '../lib/router';

export type Lang = 'en' | 'ta';

export interface SimState {
  districtId: string;
  crop: CropId;
  areaHa: number;
  params: ScenarioParams;
  interventions: InterventionId[];
  diversifyShare: number;
  sowingShift: number;
  objective: Objective;
}

interface Ctx {
  presetId: PresetId;
  params: ScenarioParams;
  setPreset: (id: PresetId) => void;
  timeRange: TimeRange;
  setTimeRange: (t: TimeRange) => void;
  risks: DistrictRisk[];
  summary: StateSummary;
  food: FoodSecurity;
  alerts: Alert[];
  insights: Insight[];
  drawerDistrict: string | null;
  openDistrict: (id: string | null) => void;
  sim: SimState;
  setSim: (patch: Partial<SimState>) => void;
  simulateDistrict: (id: string) => void;
  plan: InterventionId[];
  togglePlan: (id: InterventionId) => void;
  clearPlan: () => void;
  reviewed: Set<string>;
  markReviewed: (id: string) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  navigate: (r: RouteId) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  reportType: ReportType | null;
  setReportType: (r: ReportType | null) => void;
  presetVersion: number;
}
export type ReportType = 'district' | 'food' | 'climate';

const AppCtx = createContext<Ctx | null>(null);

const simFor = (districtId: string, params: ScenarioParams, keep?: Partial<SimState>): SimState => {
  const d = districtById(districtId)!;
  return {
    districtId, crop: primaryCrop(d), areaHa: 100, params: { ...params }, interventions: [], diversifyShare: 0.3,
    sowingShift: 0, objective: 'resilience', ...keep,
  };
};

export function AppStateProvider({ children, navigate }: { children: ReactNode; navigate: (r: RouteId) => void }) {
  const [presetId, setPresetId] = useState<PresetId>('strong');
  const [presetVersion, setPresetVersion] = useState(0);
  const params = presetById(presetId).params;
  const [timeRange, setTimeRange] = useState<TimeRange>('12m');
  const [drawerDistrict, setDrawer] = useState<string | null>(null);
  const [sim, setSimState] = useState<SimState>(() => simFor('thanjavur', presetById('strong').params));
  const [plan, setPlan] = useState<InterventionId[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [lang, setLang] = useState<Lang>('en');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType | null>(null);

  const risks = useMemo(() => allDistrictRisks(params), [params]);
  const prevent = useMemo(() => preventableRisk(params, risks), [params, risks]);
  const summary = useMemo(() => stateSummary(params, risks, prevent), [params, risks, prevent]);
  const food = useMemo(() => getFoodSecurity(risks), [risks]);
  const alerts = useMemo(() => getAlerts(params, risks, food), [params, risks, food]);
  const insights = useMemo(() => getInsights(params, risks, food, prevent), [params, risks, food, prevent]);

  const setPreset = useCallback((id: PresetId) => {
    setPresetId(id);
    setPresetVersion((v) => v + 1);
    // Scenario Lab follows the global scenario; user-chosen district/crop/interventions are kept.
    setSimState((s) => ({ ...s, params: { ...presetById(id).params } }));
    setReviewed(new Set());
  }, []);

  const setSim = useCallback((patch: Partial<SimState>) => setSimState((s) => ({ ...s, ...patch })), []);
  const simulateDistrict = useCallback((id: string) => {
    setSimState((s) => simFor(id, params, { objective: s.objective, areaHa: s.areaHa }));
    setDrawer(null);
    navigate('simulator');
  }, [params, navigate]);

  // Diversify and full crop switch are mutually exclusive in one plan.
  const togglePlan = useCallback((id: InterventionId) => setPlan((p) => {
    if (p.includes(id)) return p.filter((x) => x !== id);
    const without = id === 'switch' ? p.filter((x) => x !== 'diversify') : id === 'diversify' ? p.filter((x) => x !== 'switch') : p;
    return [...without, id];
  }), []);
  const clearPlan = useCallback(() => setPlan([]), []);
  const markReviewed = useCallback((id: string) => setReviewed((r) => new Set(r).add(id)), []);

  const value: Ctx = {
    presetId, params, setPreset, timeRange, setTimeRange, risks, summary, food, alerts, insights,
    drawerDistrict, openDistrict: setDrawer, sim, setSim, simulateDistrict, plan, togglePlan, clearPlan,
    reviewed, markReviewed, lang, setLang, navigate, paletteOpen, setPaletteOpen, reportType, setReportType, presetVersion,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}
export { PRESETS };
