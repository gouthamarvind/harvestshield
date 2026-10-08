import { DATA_NOTE, DATA_NOTE_TITLE } from './lib/dataNote';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useHashRoute, type RouteId } from './lib/router';
import { AppStateProvider, useApp } from './state/AppState';
import { ToastProvider, useToast } from './state/toast';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { CommandPalette } from './components/layout/CommandPalette';
import { DistrictDrawer } from './components/DistrictDrawer';
import { ReportModal } from './components/ReportModal';
import { PRESETS } from './data/scenarios';
import { PageSkeleton } from './components/ui/Skeleton';
import Overview from './pages/Overview';

const pages: Record<RouteId, React.ComponentType> = {
  overview: Overview,
  climate: lazy(() => import('./pages/Climate')),
  'risk-map': lazy(() => import('./pages/RiskMap')),
  crops: lazy(() => import('./pages/Crops')),
  simulator: lazy(() => import('./pages/Simulator')),
  food: lazy(() => import('./pages/FoodSecurity')),
  water: lazy(() => import('./pages/Water')),
  planner: lazy(() => import('./pages/Planner')),
  alerts: lazy(() => import('./pages/Alerts')),
  actions: lazy(() => import('./pages/ActionPlan')),
  farm: lazy(() => import('./pages/Farm')),
  insights: lazy(() => import('./pages/Insights')),
  reports: lazy(() => import('./pages/Reports')),
  settings: lazy(() => import('./pages/Settings')),
};

const CHORDS: Record<string, RouteId> = { o: 'overview', e: 'climate', m: 'risk-map', c: 'crops', s: 'simulator', f: 'food', w: 'water', p: 'planner', a: 'alerts', i: 'insights', r: 'reports' };

function Shell({ route }: { route: RouteId }) {
  const app = useApp();
  const toast = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const chord = useRef<number>(0);

  useEffect(() => { const t = setTimeout(() => setBooting(false), 650); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); app.setPaletteOpen(!app.paletteOpen); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || app.paletteOpen) return;
      const k = e.key.toLowerCase();
      if (Date.now() - chord.current < 900 && CHORDS[k]) { app.navigate(CHORDS[k]); chord.current = 0; return; }
      if (k === 'g') { chord.current = Date.now(); return; }
      if (k === '[') setCollapsed((c) => !c);
      if (/^[1-6]$/.test(k) && !el.closest('[role="dialog"]')) {
        const p = PRESETS[Number(k) - 1];
        app.setPreset(p.id);
        toast({ tone: 'success', title: `Scenario applied · ${p.name}`, body: 'Shortcut 1 = observed data, 2–6 = what-if scenarios.' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app, toast]);

  const Page = pages[route];
  return (
    <div className="backdrop flex h-full">
      <Sidebar route={route} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar route={route} onMenu={() => setMobileOpen(true)} />
        <main id="main-scroll" className="relative flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1520px] px-4 py-6 md:px-8 md:py-8">
            <AnimatePresence mode="wait">
              <motion.div key={route} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}>
                {booting ? <PageSkeleton /> : <Suspense fallback={<PageSkeleton />}><Page /></Suspense>}
              </motion.div>
            </AnimatePresence>
            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-5 text-[11.5px] leading-relaxed text-fog-600">
              <p className="max-w-3xl"><span className="font-semibold text-fog-500">{DATA_NOTE_TITLE}.</span> {DATA_NOTE}</p>
              <p>HarvestShield · VELSATHON’26 · SDG 2 Zero Hunger · SDG 13 Climate Action</p>
            </footer>
          </div>
        </main>
      </div>
      <CommandPalette />
      <DistrictDrawer />
      <ReportModal />
    </div>
  );
}

export default function App() {
  const { route, navigate } = useHashRoute();
  return (
    <ToastProvider>
      <AppStateProvider navigate={navigate}>
        <Shell route={route} />
      </AppStateProvider>
    </ToastProvider>
  );
}
