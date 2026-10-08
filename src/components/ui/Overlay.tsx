import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

export function Drawer({ open, onClose, children, width = 460, title }: { open: boolean; onClose: () => void; children: ReactNode; width?: number; title?: string }) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside role="dialog" aria-modal aria-label={title} className="glass fixed bottom-0 right-0 top-0 z-[61] flex max-w-[100vw] flex-col border-y-0 border-r-0 shadow-2xl shadow-black"
            style={{ width }} initial={{ x: width + 40 }} animate={{ x: 0 }} exit={{ x: width + 40 }} transition={{ type: 'spring', stiffness: 380, damping: 40 }}>
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-fog-500 hover:bg-white/5 hover:text-fog-100"><X className="h-4 w-4" /></button>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, onClose, children, className, title }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; title?: string }) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[65] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[6vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div role="dialog" aria-modal aria-label={title} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            className={cn('glass relative w-full max-w-2xl rounded-2xl shadow-2xl shadow-black/60', className)}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
