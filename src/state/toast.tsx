import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

type Tone = 'success' | 'info' | 'warning';
interface Toast { id: number; title: string; body?: string; tone: Tone }
const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((xs) => [...xs.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 4200);
  }, []);
  const icon = { success: CheckCircle2, info: Info, warning: AlertTriangle };
  const color = { success: 'text-mint', info: 'text-cyan', warning: 'text-amber' };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const I = icon[t.tone];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
                className="glass pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-2xl shadow-black/40">
                <I className={`mt-0.5 h-4 w-4 shrink-0 ${color[t.tone]}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-fog-100">{t.title}</div>
                  {t.body && <div className="mt-0.5 text-xs text-fog-400">{t.body}</div>}
                </div>
                <button aria-label="Dismiss" onClick={() => setToasts((xs) => xs.filter((x) => x.id !== t.id))} className="text-fog-500 hover:text-fog-100"><X className="h-3.5 w-3.5" /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
