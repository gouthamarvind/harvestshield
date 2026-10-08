import { useEffect, useState, useCallback } from 'react';

export type RouteId =
  | 'overview' | 'climate' | 'risk-map' | 'crops' | 'simulator' | 'food' | 'water'
  | 'planner' | 'alerts' | 'actions' | 'farm' | 'insights' | 'reports' | 'settings';

export const ROUTES: RouteId[] = ['overview', 'climate', 'risk-map', 'crops', 'simulator', 'food', 'water', 'planner', 'alerts', 'actions', 'farm', 'insights', 'reports', 'settings'];

function parse(): RouteId {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0] as RouteId;
  return ROUTES.includes(h) ? h : 'overview';
}

/** Minimal hash router: no server config needed, works as a static single file. */
export function useHashRoute() {
  const [route, setRoute] = useState<RouteId>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = useCallback((r: RouteId) => {
    if (window.location.hash !== `#/${r}`) window.location.hash = `#/${r}`;
    document.getElementById('main-scroll')?.scrollTo({ top: 0 });
  }, []);
  return { route, navigate };
}
