import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import { Panel } from './ui/Panel';
import { whatsappUrl } from '../lib/advisory';
import { useToast } from '../state/toast';
import type { Lang } from '../state/AppState';

const TXT = {
  en: { eyebrow: 'Share advisory', title: 'Message for the farmer', copy: 'Copy message', wa: 'Share on WhatsApp', copied: 'Message copied', copyFail: 'Copy not available in this browser', note: 'Opens WhatsApp with this text. Nothing is sent automatically, and no personal data is included.' },
  ta: { eyebrow: 'ஆலோசனையைப் பகிரவும்', title: 'விவசாயிக்கான செய்தி', copy: 'செய்தியை நகலெடுக்கவும்', wa: 'WhatsApp-ல் பகிரவும்', copied: 'செய்தி நகலெடுக்கப்பட்டது', copyFail: 'இந்த உலாவியில் நகலெடுக்க முடியவில்லை', note: 'இந்த உரையுடன் WhatsApp திறக்கும். தானாக எதுவும் அனுப்பப்படாது; தனிப்பட்ட தரவு சேர்க்கப்படவில்லை.' },
} as const;

export function AdvisoryShare({ message, lang }: { message: string; lang: Lang }) {
  const t = TXT[lang];
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ tone: 'success', title: t.copied });
    } catch {
      toast({ tone: 'warning', title: t.copyFail });
    }
  };
  return (
    <Panel eyebrow={t.eyebrow} title={t.title} delay={0.03}>
      <pre className={`whitespace-pre-wrap break-words rounded-xl border border-white/[0.06] bg-black/30 p-4 font-sans text-[12.5px] leading-relaxed text-fog-200 ${showAll ? '' : 'max-h-[180px] overflow-hidden'} ${lang === 'ta' ? 'tamil' : ''}`}>{message}</pre>
      <button className="mt-2 text-[12px] text-cyan underline-offset-2 hover:underline" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show less' : 'Show full message'}</button>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" className="btn-subtle h-9 text-[12.5px]"><MessageCircle className="h-4 w-4" />{t.wa}</a>
        <button className="btn-ghost h-9 text-[12.5px]" onClick={copy}><Copy className="h-4 w-4" />{t.copy}</button>
      </div>
      <p className="mt-2 text-[11.5px] text-fog-500">{t.note}</p>
    </Panel>
  );
}
