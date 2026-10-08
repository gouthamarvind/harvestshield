/**
 * Local workflow state: alert lifecycle and action plan.
 * Stored per browser (localStorage). There is no shared backend yet, and the UI says so.
 */
import { DISTRICTS } from '../data/districts';

export const ALERTS_KEY = 'hs.alerts.v1';
export const ACTIONS_KEY = 'hs.actions.v1';

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED';
export interface AlertState { status: AlertStatus; owner: string; updatedAt: string }

export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
export type ActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ActionSource = 'Example' | 'Alert' | 'Manual';
export interface ActionItem {
  id: string; title: string; district: string; owner: string; deadline: string;
  priority: ActionPriority; status: ActionStatus; source: ActionSource; createdAt: string; updatedAt: string;
}

/** Responsible roles, not named people. */
export const OWNERS = [
  'District Agriculture Officer',
  'Extension Team (KVK)',
  'Irrigation Department',
  'Food Department (PDS)',
  'District Disaster Management Committee',
  'Farmer Producer Organisation',
];

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = { PENDING: 'Pending', IN_PROGRESS: 'In progress', DONE: 'Done' };
export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = { OPEN: 'Open', ACKNOWLEDGED: 'Acknowledged', ASSIGNED: 'Assigned', RESOLVED: 'Resolved' };
export const DISTRICT_NAMES = DISTRICTS.map((d) => d.name).sort();

/** Local calendar date as YYYY-MM-DD (avoids the UTC off-by-one near midnight in India). */
export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const todayIso = () => ymd(new Date());
export function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export const nowIso = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
export const isOverdue = (a: ActionItem) => a.status !== 'DONE' && a.deadline < todayIso();

/** Example actions so the page is not empty on first open. They are labelled "Example" and can be deleted. */
export function seedActions(): ActionItem[] {
  const t = nowIso();
  const mk = (i: number, title: string, district: string, owner: string, days: number, priority: ActionPriority, status: ActionStatus): ActionItem =>
    ({ id: `example-${i}`, title, district, owner, deadline: addDays(days), priority, status, source: 'Example', createdAt: t, updatedAt: t });
  return [
    mk(1, 'Review canal allocation for tail-end blocks', 'Thanjavur', 'Irrigation Department', 7, 'HIGH', 'PENDING'),
    mk(2, 'Send sowing-delay advisory to farmers (Tamil and English)', 'Thanjavur', 'Extension Team (KVK)', 3, 'HIGH', 'IN_PROGRESS'),
    mk(3, 'Check PDS reserves in exposed blocks', 'Nagapattinam', 'Food Department (PDS)', 10, 'MEDIUM', 'PENDING'),
  ];
}
