import { useCountUp } from '../../lib/useCountUp';

interface Props { value: number; decimals?: number; prefix?: string; suffix?: string; format?: (v: number) => string; className?: string; duration?: number }
export function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', format, className, duration }: Props) {
  const v = useCountUp(value, duration);
  const text = format ? format(v) : v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className={`num ${className ?? ''}`}>{prefix}{text}{suffix}</span>;
}
