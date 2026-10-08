import { LayoutDashboard, Waves, Map, Sprout, FlaskConical, Wheat, Droplets, ListChecks, BellRing, Smartphone, Lightbulb, FileText, Settings, type LucideIcon } from 'lucide-react';
import type { RouteId } from '../../lib/router';

export interface NavItem { id: RouteId; label: string; icon: LucideIcon; group: 'Monitor' | 'Decide' | 'Operate' | 'System'; shortcut?: string; tag?: string }
export const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Monitor', shortcut: 'G O' },
  { id: 'climate', label: 'Climate Intelligence', icon: Waves, group: 'Monitor', shortcut: 'G E' },
  { id: 'risk-map', label: 'Risk Map', icon: Map, group: 'Monitor', shortcut: 'G M' },
  { id: 'crops', label: 'Crop Intelligence', icon: Sprout, group: 'Monitor', shortcut: 'G C' },
  { id: 'simulator', label: 'Scenario Lab', icon: FlaskConical, group: 'Decide', shortcut: 'G S', tag: 'What-if' },
  { id: 'food', label: 'Food Security', icon: Wheat, group: 'Decide', shortcut: 'G F' },
  { id: 'water', label: 'Water Intelligence', icon: Droplets, group: 'Decide', shortcut: 'G W' },
  { id: 'planner', label: 'Intervention Planner', icon: ListChecks, group: 'Decide', shortcut: 'G P' },
  { id: 'alerts', label: 'Alert Center', icon: BellRing, group: 'Operate', shortcut: 'G A' },
  { id: 'farm', label: 'Farm View', icon: Smartphone, group: 'Operate' },
  { id: 'insights', label: 'Insights', icon: Lightbulb, group: 'Operate', shortcut: 'G I' },
  { id: 'reports', label: 'Reports', icon: FileText, group: 'Operate', shortcut: 'G R' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'System' },
];
export const navById = (id: RouteId) => NAV.find((n) => n.id === id)!;
