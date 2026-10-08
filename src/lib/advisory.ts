export interface Bilingual { en: string; ta: string }
export interface AdvisoryFields {
  district: Bilingual; crop: Bilingual; risk: Bilingual; rain: Bilingual; temperature: Bilingual;
  oni: Bilingual; water: Bilingual; actions: Bilingual[]; quality: Bilingual; url: string;
}

const L = {
  en: { head: 'HARVESTSHIELD advisory', loc: 'Location', crop: 'Crop', risk: 'Modelled climate risk', rain: 'Rain since 1 June (your district)', temp: 'Temperature (your district)', oni: 'El Niño (NOAA ONI)', water: 'Water', act: 'What to do', quality: 'Data quality', link: 'Dashboard', note: 'Decision support only. Check with your local agriculture office before acting.' },
  ta: { head: 'ஹாரிவ்ஷீல்ட் ஆலோசனை', loc: 'இடம்', crop: 'பயிர்', risk: 'மதிப்பிடப்பட்ட காலநிலை ஆபத்து', rain: 'ஜூன் 1 முதல் மழை (உங்கள் மாவட்டம்)', temp: 'வெப்பநிலை (உங்கள் மாவட்டம்)', oni: 'எல் நினோ (NOAA)', water: 'நீர் நிலை', act: 'செய்ய வேண்டியவை', quality: 'தரவு தரம்', link: 'டாஷ்போர்டு', note: 'இது முடிவெடுக்க உதவும் மதிப்பீடு மட்டுமே. செயல்படுவதற்கு முன் உள்ளூர் வேளாண் அலுவலகத்தில் உறுதி செய்யவும்.' },
} as const;

/** WhatsApp-ready message. Contains no names, phone numbers or other personal data. */
export function buildAdvisory(lang: 'en' | 'ta', f: AdvisoryFields): string {
  const t = L[lang];
  const p = (b: Bilingual) => b[lang];
  return [
    `*${t.head}*`,
    `📍 ${t.loc}: ${p(f.district)}`,
    `🌾 ${t.crop}: ${p(f.crop)}`,
    `⚠️ ${t.risk}: ${p(f.risk)}`,
    `🌧️ ${t.rain}: ${p(f.rain)}`,
    `🌡️ ${t.temp}: ${p(f.temperature)}`,
    `🌊 ${t.oni}: ${p(f.oni)}`,
    `💧 ${t.water}: ${p(f.water)}`,
    `✅ ${t.act}:`,
    ...f.actions.map((a, i) => `${i + 1}. ${p(a)}`),
    `📊 ${t.quality}: ${p(f.quality)}`,
    `🔗 ${t.link}: ${f.url}`,
    '',
    t.note,
  ].join('\n');
}

/** Public app address only (no hash, no user data). */
export function appUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}#/farm`;
}

export const whatsappUrl = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`;
