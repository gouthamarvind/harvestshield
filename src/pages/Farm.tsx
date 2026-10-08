import { motion } from 'framer-motion';
import { Volume2, CloudRain, Droplets, Thermometer, ChevronRight, MessageSquare, Phone, Wifi, Battery, Signal, Sprout } from 'lucide-react';
import { useMemo } from 'react';
import { useApp, type Lang } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Segmented } from '../components/ui/Segmented';
import { districtById } from '../data/districts';
import { basePlan, evaluatePlan } from '../model/plan';
import { interventionEffect, type InterventionId } from '../services/interventionService';
import { riskBand, riskColor } from '../lib/risk';
import { useToast } from '../state/toast';
import { fmtSigned } from '../lib/format';
import { ONI, ONI_LABEL, WEATHER } from '../data/observed';
import { dataQuality } from '../lib/dataQuality';
import { buildAdvisory, appUrl } from '../lib/advisory';
import { AdvisoryShare } from '../components/AdvisoryShare';

const ACRES = 3.2;
const HA = ACRES / 2.471;

const T = {
  en: { myFarm: 'My farm', acres: 'acres', crop: 'Current crop', rice: 'Rice', risk: 'Risk', what: 'What should I do?', listen: 'Listen', rain: 'Rain', water: 'Water', heat: 'Heat', season: 'Samba season · Thanjavur', band: { LOW: 'LOW', MODERATE: 'MEDIUM', HIGH: 'HIGH', SEVERE: 'VERY HIGH' }, saves: 'Lowers risk by', updated: 'Updated today, 6:00 AM', call: 'Call extension officer' },
  ta: { myFarm: 'என் பண்ணை', acres: 'ஏக்கர்', crop: 'தற்போதைய பயிர்', rice: 'நெல்', risk: 'ஆபத்து', what: 'நான் என்ன செய்ய வேண்டும்?', listen: 'கேளுங்கள்', rain: 'மழை', water: 'நீர்', heat: 'வெப்பம்', season: 'சம்பா பருவம் · தஞ்சாவூர்', band: { LOW: 'குறைவு', MODERATE: 'நடுத்தரம்', HIGH: 'அதிகம்', SEVERE: 'மிக அதிகம்' }, saves: 'ஆபத்து குறைவு', updated: 'இன்று காலை 6:00 புதுப்பிக்கப்பட்டது', call: 'வேளாண் அலுவலரை அழைக்கவும்' },
} as const;

const REC: Record<InterventionId, { en: [string, string]; ta: [string, string] }> = {
  diversify: { en: ['Plant millet on 1 acre', 'Millet needs much less water. Keep rice on the rest of your land.'], ta: ['1 ஏக்கரில் சிறுதானியம் பயிரிடுங்கள்', 'சிறுதானியத்திற்கு குறைந்த நீர் போதும். மீதமுள்ள நிலத்தில் நெல் தொடரலாம்.'] },
  delay: { en: ['Wait 2 weeks before transplanting', 'Better rain is expected after the north-east monsoon starts.'], ta: ['நடவை 2 வாரம் தள்ளிப் போடுங்கள்', 'வடகிழக்கு பருவமழை தொடங்கிய பின் நல்ல மழை எதிர்பார்க்கப்படுகிறது.'] },
  awd: { en: ['Water every few days, not every day', 'Let the field dry slightly between watering (AWD). Saves water, same harvest.'], ta: ['தினமும் அல்ல, சில நாட்களுக்கு ஒருமுறை நீர் பாய்ச்சுங்கள்', 'மாற்று நனைத்தல்-உலர்த்தல் முறை நீரைச் சேமிக்கும்.'] },
  protect: { en: ['Join your water users group request', 'Ask for protected canal water during flowering.'], ta: ['நீர் பயனர் சங்கத்துடன் இணையுங்கள்', 'பூக்கும் பருவத்தில் கால்வாய் நீர் ஒதுக்கீட்டைக் கேளுங்கள்.'] },
  switch: { en: ['Consider millet this season', 'Much lower risk, but lower total harvest.'], ta: ['இந்தப் பருவத்தில் சிறுதானியம் பரிசீலிக்கவும்', 'ஆபத்து குறைவு, ஆனால் மகசூல் குறையும்.'] },
  reserves: { en: ['Register for ration support', 'Make sure your family ration card is active.'], ta: ['ரேஷன் உதவிக்கு பதிவு செய்யுங்கள்', 'உங்கள் குடும்ப அட்டை செயலில் உள்ளதா என உறுதி செய்யுங்கள்.'] },
};

export default function Farm() {
  const { params, lang, setLang, presetId } = useApp();
  const toast = useToast();
  const t = T[lang];
  const d = districtById('thanjavur')!;
  const out = useMemo(() => evaluatePlan(params, basePlan('rice'), HA, d), [params, d]);
  const recs = useMemo(() => (['diversify', 'delay', 'awd', 'protect'] as InterventionId[])
    .map((id) => ({ id, e: interventionEffect(params, d, 'rice', HA, id) }))
    .sort((a, b) => b.e.riskReduction - a.e.riskReduction).slice(0, 3), [params, d]);
  const band = riskBand(out.risk);
  const quality = dataQuality(d.id, presetId === 'observed');
  const obs = WEATHER?.districts?.[d.id];
  const rainPct = obs?.rainAnomPct ?? params.rainfall;
  const tempC = obs?.tempAnomC ?? params.temperature;
  const message = buildAdvisory(lang, {
    district: { en: 'Thanjavur', ta: 'தஞ்சாவூர்' },
    crop: { en: 'Rice (samba)', ta: 'நெல் (சம்பா)' },
    risk: { en: T.en.band[band], ta: T.ta.band[band] },
    rain: { en: `${fmtSigned(rainPct, 0, '%')} vs normal`, ta: `${fmtSigned(rainPct, 0, '%')} (இயல்புடன் ஒப்பிடும்போது)` },
    temperature: { en: `${fmtSigned(tempC, 1, '°C')} vs normal`, ta: `${fmtSigned(tempC, 1, '°C')} (இயல்புடன் ஒப்பிடும்போது)` },
    oni: { en: `${ONI.latest.value >= 0 ? '+' : ''}${ONI.latest.value.toFixed(2)} (${ONI_LABEL})`, ta: `${ONI.latest.value.toFixed(2)} (${ONI_LABEL})` },
    water: { en: `${params.water}% of normal (assumed input)`, ta: `${params.water}% (ஊகிக்கப்பட்ட உள்ளீடு)` },
    actions: recs.map((r) => ({ en: REC[r.id].en[0], ta: REC[r.id].ta[0] })),
    quality: { en: `${quality.level}. ${quality.reason}`, ta: `${quality.ta}` },
    url: appUrl(),
  });

  const speak = () => {
    const text = lang === 'en'
      ? `Your rice farm risk is ${t.band[band]}. ${recs.map((r, i) => `Step ${i + 1}: ${REC[r.id].en[0]}.`).join(' ')}`
      : `${t.risk} ${t.band[band]}. ${recs.map((r) => REC[r.id].ta[0]).join('. ')}`;
    if (!('speechSynthesis' in window)) { toast({ tone: 'warning', title: 'Voice not supported in this browser' }); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-IN' : 'ta-IN';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    toast({ tone: 'info', title: lang === 'en' ? 'Playing voice advisory' : 'குரல் ஆலோசனை', body: 'Uses your browser’s text-to-speech voices.' });
  };

  return (
    <div>
      <PageHeader eyebrow="Community · Farmer channel" title="Farm View" subtitle="The same model, translated into three plain-language actions for a smallholder — delivered by app, SMS or voice in the farmer’s language."
        actions={<Segmented<Lang> value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'ta', label: <span className="tamil">தமிழ்</span> }]} />} />
      <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr]">
        {/* Phone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-[360px] rounded-[44px] border border-white/10 bg-black p-3 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(61,245,138,0.08),0_0_60px_-10px_rgba(61,245,138,0.15)]">
          <div className={`relative overflow-hidden rounded-[34px] bg-ink-900 ${lang === 'ta' ? 'tamil' : ''}`}>
            <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] text-fog-300"><span className="font-semibold">9:41</span><span className="flex items-center gap-1"><Signal className="h-3 w-3" /><Wifi className="h-3 w-3" /><Battery className="h-3.5 w-3.5" /></span></div>
            <div className="px-5 pb-6 pt-3">
              <div className="flex items-center justify-between">
                <div><div className="text-[11px] text-fog-500">{t.season}</div><div className="text-[22px] font-semibold">{t.myFarm}</div></div>
                <button onClick={speak} className="grid h-11 w-11 place-items-center rounded-full bg-mint text-ink-950 shadow-[0_0_20px_rgba(61,245,138,0.5)] transition active:scale-95" aria-label={t.listen}><Volume2 className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 rounded-3xl border p-4" style={{ borderColor: `${riskColor(out.risk)}55`, background: `linear-gradient(160deg, ${riskColor(out.risk)}22, transparent 70%)` }}>
                <div className="flex items-end justify-between">
                  <div><div className="text-[12px] text-fog-400">{ACRES} {t.acres}</div><div className="mt-0.5 flex items-center gap-1.5 text-[15px] font-medium"><Sprout className="h-4 w-4 text-cyan" />{t.crop}: {t.rice}</div></div>
                  <div className="text-right"><div className="text-[11px] text-fog-400">{t.risk}</div><div className="text-[26px] font-bold leading-none" style={{ color: riskColor(out.risk) }}>{t.band[band]}</div></div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full" style={{ background: riskColor(out.risk) }} animate={{ width: `${out.risk}%` }} /></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[{ i: CloudRain, l: t.rain, v: fmtSigned(rainPct, 0, '%'), c: '#4FE3F0' }, { i: Droplets, l: t.water, v: `${params.water}%`, c: '#7C9CFF' }, { i: Thermometer, l: t.heat, v: fmtSigned(tempC, 1, '°'), c: '#FF7A3D' }].map((x) => (
                  <div key={x.l} className="rounded-2xl bg-white/[0.04] py-2.5"><x.i className="mx-auto h-4 w-4" style={{ color: x.c }} /><div className="mt-1 text-[10.5px] text-fog-500">{x.l}</div><div className="num text-[14px] font-semibold">{x.v}</div></div>
                ))}
              </div>
              <div className="mt-5 text-[17px] font-semibold">{t.what}</div>
              <div className="mt-2.5 space-y-2.5">
                {recs.map((r, i) => (
                  <motion.div key={r.id + lang} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mint/15 text-[14px] font-bold text-mint">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold leading-snug">{REC[r.id][lang][0]}</div>
                      <div className="mt-0.5 text-[11.5px] leading-snug text-fog-400">{REC[r.id][lang][1]}</div>
                      {r.e.riskReduction > 0.5 && <div className="mt-1 text-[11px] font-medium text-mint">{t.saves} {r.e.riskReduction.toFixed(0)}%</div>}
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-fog-600" />
                  </motion.div>
                ))}
              </div>
              <button onClick={() => toast({ tone: 'info', title: lang === 'en' ? 'Call request sent' : 'அழைப்பு கோரிக்கை அனுப்பப்பட்டது', body: 'Demo: extension officer callback queued.' })} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-[13px] font-medium text-fog-100"><Phone className="h-4 w-4" />{t.call}</button>
              <div className="mt-3 text-center text-[10.5px] text-fog-600">{t.updated}</div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          <AdvisoryShare message={message} lang={lang} />
          <Panel eyebrow="How it reaches farmers" title="Same intelligence, simpler surface">
            <div className="grid gap-3 md:grid-cols-3">
              {[{ i: Volume2, h: 'Voice advisory', p: 'IVR call or in-app audio in Tamil for low-literacy users. Tap the speaker on the phone to hear it.' }, { i: MessageSquare, h: 'SMS / WhatsApp', p: 'Weekly 160-character action message tied to the farmer’s crop calendar.' }, { i: Phone, h: 'Extension officer', p: 'Officers see the district view and call farmers with the highest modelled risk first.' }].map((c) => (
                <div key={c.h} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><c.i className="h-5 w-5 text-mint" /><div className="mt-3 text-[14px] font-semibold">{c.h}</div><div className="mt-1 text-[12.5px] leading-relaxed text-fog-400">{c.p}</div></div>
              ))}
            </div>
          </Panel>
          <Panel eyebrow="Under the hood" title={`This farm under ${riskBand(out.risk).toLowerCase()} risk`}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[['Modelled risk', `${out.risk.toFixed(0)}%`], ['Expected yield', `${out.yieldTHa.toFixed(2)} t/ha`], ['Production', `${(out.productionT).toFixed(1)} t`], ['Water need', `${(out.waterML).toFixed(1)} ML`]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[10.5px] uppercase tracking-wider text-fog-500">{k}</div><div className="num mt-1 text-[20px] font-semibold">{v}</div></div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-fog-500">Recommendations are the top three single interventions by modelled risk reduction for a {ACRES}-acre rice plot in Thanjavur, rewritten in plain language. Tamil text is a preview translation for the prototype.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
