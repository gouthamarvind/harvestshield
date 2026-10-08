import { useMemo, useState } from 'react';
import { Download, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Segmented } from '../components/ui/Segmented';
import { Badge, type Tone } from '../components/ui/Badge';
import { useApp } from '../state/AppState';
import { useToast } from '../state/toast';
import { usePersisted } from '../lib/store';
import { toCsv, downloadText } from '../lib/csv';
import { presetById } from '../data/scenarios';
import { buildDistrictRows, EXPORT_COLUMNS } from '../services/districtExport';
import { ACTIONS_KEY, OWNERS, DISTRICT_NAMES, ACTION_STATUS_LABEL, addDays, isOverdue, newId, nowIso, seedActions, todayIso, type ActionItem, type ActionPriority, type ActionStatus } from '../services/workflow';

const STATUS_TONE: Record<ActionStatus, Tone> = { PENDING: 'neutral', IN_PROGRESS: 'amber', DONE: 'mint' };
const field = 'h-8 rounded-lg border border-white/10 bg-ink-900 px-2 text-[12px] text-fog-200';

export default function ActionPlan() {
  const { risks, params, presetId } = useApp();
  const toast = useToast();
  const [items, setItems] = usePersisted<ActionItem[]>(ACTIONS_KEY, seedActions());
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');
  const [title, setTitle] = useState('');
  const [district, setDistrict] = useState('Thanjavur');
  const [owner, setOwner] = useState('');
  const [deadline, setDeadline] = useState(addDays(7));
  const [priority, setPriority] = useState<ActionPriority>('HIGH');

  const update = (id: string, patch: Partial<ActionItem>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowIso() } : x)));
  const remove = (a: ActionItem) => { setItems((xs) => xs.filter((x) => x.id !== a.id)); toast({ tone: 'info', title: 'Action removed', body: a.title }); };
  const add = () => {
    if (!title.trim()) { toast({ tone: 'warning', title: 'Describe the action first' }); return; }
    const t = nowIso();
    setItems((xs) => [{ id: newId('act'), title: title.trim(), district, owner, deadline, priority, status: 'PENDING', source: 'Manual', createdAt: t, updatedAt: t }, ...xs]);
    setTitle('');
    toast({ tone: 'success', title: 'Action added', body: `${district} · due ${deadline}` });
  };
  const clearExamples = () => { setItems((xs) => xs.filter((x) => x.source !== 'Example')); toast({ tone: 'info', title: 'Example actions removed' }); };

  const counts = useMemo(() => ({
    open: items.filter((a) => a.status !== 'DONE').length,
    inProgress: items.filter((a) => a.status === 'IN_PROGRESS').length,
    done: items.filter((a) => a.status === 'DONE').length,
    overdue: items.filter(isOverdue).length,
  }), [items]);
  const visible = items
    .filter((a) => (filter === 'all' ? true : filter === 'open' ? a.status !== 'DONE' : a.status === 'DONE'))
    .sort((a, b) => (a.status === 'DONE' ? 1 : 0) - (b.status === 'DONE' ? 1 : 0) || a.deadline.localeCompare(b.deadline));
  const examples = items.some((a) => a.source === 'Example');

  const exportCsv = () => {
    const observed = presetId === 'observed';
    const rows = buildDistrictRows(risks, params, observed, presetById(presetId).name, items);
    downloadText(`harvestshield_districts_${todayIso()}.csv`, toCsv(EXPORT_COLUMNS, rows));
    toast({ tone: 'success', title: 'CSV downloaded', body: `${rows.length} districts · scenario: ${presetById(presetId).name}` });
  };

  return (
    <div>
      <PageHeader eyebrow="Operate · Action plan" title="Action Plan"
        subtitle="Turn alerts and recommendations into owned, dated tasks. Owners are roles, not named people."
        actions={<button className="btn-ghost h-9 text-[12.5px]" onClick={exportCsv}><Download className="h-4 w-4" />Export district CSV</button>} />
      <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] px-4 py-2.5 text-[12.5px] text-amber-100/90">
        Saved in this browser only. Nothing is shared with the district office or other users until a shared backend is connected.
        {examples && <button className="ml-2 underline underline-offset-2" onClick={clearExamples}>Remove example actions</button>}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[{ l: 'Open', v: counts.open }, { l: 'In progress', v: counts.inProgress }, { l: 'Done', v: counts.done }, { l: 'Overdue', v: counts.overdue }].map((x) => (
          <div key={x.l} className="panel p-4"><div className="eyebrow">{x.l}</div><div className="num mt-1 text-[24px] font-semibold">{x.v}</div></div>
        ))}
      </div>

      <Panel eyebrow="New action" title="Add an action" delay={0.03}>
        <div className="grid gap-2 md:grid-cols-[2fr_1fr_1.3fr_auto_auto_auto] md:items-center">
          <input aria-label="Action description" className={`${field} h-9`} placeholder="Describe the action" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select aria-label="District" className={`${field} h-9`} value={district} onChange={(e) => setDistrict(e.target.value)}>
            {DISTRICT_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="Tamil Nadu">Tamil Nadu (state)</option>
          </select>
          <select aria-label="Owner" className={`${field} h-9`} value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Unassigned</option>
            {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input aria-label="Deadline" type="date" className={`${field} h-9`} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <select aria-label="Priority" className={`${field} h-9`} value={priority} onChange={(e) => setPriority(e.target.value as ActionPriority)}>
            <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <button className="btn-ghost h-9 text-[12.5px]" onClick={add}><Plus className="h-4 w-4" />Add</button>
        </div>
      </Panel>

      <Panel className="mt-4" eyebrow={`${visible.length} shown`} title="Actions" delay={0.05}
        actions={<Segmented value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'done', label: 'Done' }, { value: 'all', label: 'All' }]} />}>
        <div className="space-y-2">
          {visible.map((a) => {
            const overdue = isOverdue(a);
            return (
              <div key={a.id} className={`grid gap-3 rounded-xl border bg-white/[0.02] p-3.5 lg:grid-cols-[1fr_auto] ${overdue ? 'border-red-400/40' : 'border-white/[0.07]'}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold">{a.title}</span>
                    {a.source === 'Example' && <Badge tone="amber">Example</Badge>}
                    {a.source === 'Alert' && <Badge tone="cyan">From alert</Badge>}
                    {overdue && <Badge tone="danger" dot>Overdue</Badge>}
                  </div>
                  <div className="mt-1 text-[11.5px] text-fog-500">{a.district} · {a.owner || 'Unassigned'} · updated {a.updatedAt.slice(0, 10)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <select aria-label={`Owner for ${a.title}`} className={field} value={a.owner} onChange={(e) => update(a.id, { owner: e.target.value })}>
                    <option value="">Unassigned</option>
                    {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input aria-label={`Deadline for ${a.title}`} type="date" className={field} value={a.deadline} onChange={(e) => update(a.id, { deadline: e.target.value })} />
                  <select aria-label={`Priority for ${a.title}`} className={field} value={a.priority} onChange={(e) => update(a.id, { priority: e.target.value as ActionPriority })}>
                    <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                  </select>
                  <select aria-label={`Status for ${a.title}`} className={field} value={a.status} onChange={(e) => update(a.id, { status: e.target.value as ActionStatus })}>
                    {(Object.keys(ACTION_STATUS_LABEL) as ActionStatus[]).map((s) => <option key={s} value={s}>{ACTION_STATUS_LABEL[s]}</option>)}
                  </select>
                  <Badge tone={STATUS_TONE[a.status]}>{ACTION_STATUS_LABEL[a.status]}</Badge>
                  {a.status !== 'DONE' && <button className="btn-subtle h-8 text-[12px]" onClick={() => update(a.id, { status: 'DONE' })}><CheckCircle2 className="h-3.5 w-3.5" />Mark complete</button>}
                  <button aria-label={`Delete ${a.title}`} className="btn-subtle h-8 px-2" onClick={() => remove(a)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && <div className="py-10 text-center text-[13px] text-fog-500">No actions here. Add one above, or send an alert to the plan from Alert Center.</div>}
        </div>
        <p className="mt-3 text-[11.5px] text-fog-500">Today is {todayIso()}. Overdue means the deadline has passed and the action is not done.</p>
      </Panel>
    </div>
  );
}
