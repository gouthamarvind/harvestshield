import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { riskBand, bandTone } from '../../lib/risk';

export type Tone = 'mint' | 'amber' | 'ember' | 'danger' | 'cyan' | 'neutral' | 'lime';
const tones: Record<Tone, string> = {
  mint: 'border-mint/25 bg-mint/10 text-mint',
  lime: 'border-lime/25 bg-lime/10 text-lime',
  amber: 'border-amber/25 bg-amber/10 text-amber',
  ember: 'border-ember/30 bg-ember/10 text-ember',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  cyan: 'border-cyan/25 bg-cyan/10 text-cyan',
  neutral: 'border-white/10 bg-white/[0.04] text-fog-300',
};
export function Badge({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('chip', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />}
      {children}
    </span>
  );
}
export function RiskBadge({ score, className }: { score: number; className?: string }) {
  const b = riskBand(score);
  return <Badge tone={bandTone[b]} dot className={className}>{b}</Badge>;
}
const levelTone: Record<string, Tone> = { LOW: 'mint', MEDIUM: 'amber', MODERATE: 'amber', HIGH: 'ember', CRITICAL: 'danger', SEVERE: 'danger', INFO: 'cyan' };
export function LevelBadge({ level, className }: { level: string; className?: string }) {
  return <Badge tone={levelTone[level] ?? 'neutral'} dot className={className}>{level}</Badge>;
}
export const levelColor = (level: string) => ({ LOW: '#3DF58A', MEDIUM: '#F5B83D', MODERATE: '#F5B83D', HIGH: '#FF7A3D', CRITICAL: '#FF4D5E', SEVERE: '#FF4D5E', INFO: '#4FE3F0' } as Record<string, string>)[level] ?? '#A9BFB2';
