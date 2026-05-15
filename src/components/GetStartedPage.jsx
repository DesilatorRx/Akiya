import { useState } from 'react';
import { C, serif, sans } from '../theme.js';
import { PREFECTURES_47, AGENTS } from '../data/prefectures.js';
import { AFFILIATES } from '../lib/affiliates.js';

const STEPS = [
  {
    t: 'Decide your purpose & budget',
    d: 'Holiday home, relocation, rental, or restoration project? This drives location, condition tolerance, and the renovation reserve you need (often more than the purchase price for cheap akiya).',
  },
  {
    t: 'Search the akiya banks',
    d: 'Each municipality runs its own 空き家バンク (akiya bank). Use the national aggregators below to drill into prefecture and town listings. Free properties usually carry residency or restoration conditions.',
  },
  {
    t: 'Check residency & ownership rules',
    d: 'Foreigners can freely own land and buildings in Japan with no visa requirement to purchase. But living there long-term needs an appropriate visa, and some free-akiya programmes require you to relocate.',
  },
  {
    t: 'Contact the municipality or agent',
    d: 'Send an inquiry letter (use the generator below). Many banks require registering as a prospective buyer before viewing. A bilingual agent smooths this considerably.',
  },
  {
    t: 'Inspect the property',
    d: 'Visit in person or send an inspector. Look for termite damage (shiroari), roof condition, foundation, and whether it predates the 1981 earthquake code (旧耐震). Budget for retrofitting.',
  },
  {
    t: 'Make an offer & sign',
    d: 'Offers go through the municipality or agent. A judicial scrivener (司法書士) handles the title transfer registration. Expect a contract in Japanese — get it translated.',
  },
  {
    t: 'Pay taxes & register title',
    d: 'Budget for acquisition tax, registration & license tax, stamp duty, and agent commission (all skipped on free akiya). Use the per-property estimator in each listing.',
  },
  {
    t: 'Renovate & maintain',
    d: 'Line up contractors early — rural areas have few. Annual Fixed Asset Tax (1.4%) and City Planning Tax (≤0.3%) apply on the assessed value even while you renovate.',
  },
];

function LetterGenerator() {
  const [form, setForm] = useState({
    name: '',
    property: '',
    municipality: '',
    intent: 'purchase as a primary residence and restore it',
    lang: 'both',
  });
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function generate() {
    if (busy) return;
    setBusy(true);
    setOut('');
    const langInstruction =
      form.lang === 'jp'
        ? 'Write the letter in polite formal Japanese only.'
        : form.lang === 'en'
        ? 'Write the letter in polite formal English only.'
        : 'Provide the letter in polite formal Japanese, then an English translation below it.';

    const system =
      'You draft concise, courteous inquiry letters to Japanese municipal ' +
      'akiya banks on behalf of foreign buyers. Keep it under 250 words per ' +
      'language. Use appropriate Japanese business etiquette (拝啓 / 敬具) ' +
      'when writing Japanese. ' +
      langInstruction;

    const userMsg =
      `Sender name: ${form.name || '(applicant)'}\n` +
      `Property of interest: ${form.property || '(akiya listing)'}\n` +
      `Municipality / akiya bank: ${form.municipality || '(municipal office)'}\n` +
      `Stated intent: ${form.intent}\n` +
      'Ask to register as a prospective buyer and request a viewing and ' +
      'any conditions attached to the property.';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system,
          maxTokens: 1200,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });
      const data = await res.json();
      setOut(data.text || data.error || 'No response.');
    } catch (e) {
      setOut(`Request failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const field = (label, k, placeholder) => (
    <label style={{ fontSize: 13, fontFamily: sans, display: 'block' }}>
      {label}
      <input
        value={form[k]}
        onChange={set(k)}
        placeholder={placeholder}
        style={{
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          marginTop: 4,
          padding: 9,
          border: `1px solid ${C.line}`,
          borderRadius: 6,
          fontFamily: sans,
        }}
      />
    </label>
  );

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: 20,
      }}
    >
      <h3 style={{ marginTop: 0, fontFamily: serif, color: C.navy }}>
        AI inquiry-letter generator
      </h3>
      <p style={{ fontFamily: sans, color: C.muted, fontSize: 14, marginTop: 0 }}>
        Generates a polite letter to a municipal akiya bank in Japanese,
        English, or both.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {field('Your name', 'name', 'Jane Smith')}
        {field('Property / listing ref', 'property', 'Iiyama minka, ref aky-001')}
        {field('Municipality', 'municipality', 'Iiyama City, Nagano')}
        <label style={{ fontSize: 13, fontFamily: sans, display: 'block' }}>
          Intent
          <input
            value={form.intent}
            onChange={set('intent')}
            style={{
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              marginTop: 4,
              padding: 9,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              fontFamily: sans,
            }}
          />
        </label>
        <label style={{ fontSize: 13, fontFamily: sans, display: 'block' }}>
          Language
          <select
            value={form.lang}
            onChange={set('lang')}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: 9,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              fontFamily: sans,
            }}
          >
            <option value="both">Japanese + English</option>
            <option value="jp">Japanese only</option>
            <option value="en">English only</option>
          </select>
        </label>
      </div>
      <button
        onClick={generate}
        disabled={busy}
        style={{
          marginTop: 16,
          background: C.red,
          color: C.white,
          border: 'none',
          padding: '11px 22px',
          borderRadius: 6,
          fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer',
          fontFamily: sans,
        }}
      >
        {busy ? 'Generating…' : 'Generate letter'}
      </button>
      {out && (
        <pre
          style={{
            marginTop: 16,
            background: C.cream,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            padding: 16,
            whiteSpace: 'pre-wrap',
            fontFamily: sans,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {out}
        </pre>
      )}
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <div>
      <h1 style={{ fontFamily: serif, color: C.navy, fontSize: 32 }}>
        How to buy an akiya
      </h1>
      <p style={{ fontFamily: sans, color: C.muted, marginTop: 0 }}>
        An eight-step path from idea to keys, plus tools and every
        prefecture's akiya-bank entry point.
      </p>

      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          counterReset: 'step',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        {STEPS.map((s, i) => (
          <li
            key={i}
            style={{
              background: C.white,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              padding: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  background: C.navy,
                  color: C.gold,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontFamily: sans,
                }}
              >
                {i + 1}
              </span>
              <strong
                style={{ fontFamily: serif, color: C.navy, fontSize: 17 }}
              >
                {s.t}
              </strong>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: sans,
                fontSize: 14,
                lineHeight: 1.6,
                color: C.ink,
              }}
            >
              {s.d}
            </p>
          </li>
        ))}
      </ol>

      <h2 style={{ fontFamily: serif, color: C.navy, marginTop: 40 }}>
        Draft your inquiry letter
      </h2>
      <LetterGenerator />

      <h2 style={{ fontFamily: serif, color: C.navy, marginTop: 40 }}>
        Sending money & services
      </h2>
      <p
        style={{
          fontFamily: sans,
          color: C.muted,
          fontSize: 14,
          marginTop: 0,
          maxWidth: 720,
        }}
      >
        Most overseas akiya purchases are paid in cash, so moving funds to
        Japan affordably matters. These are the services foreign buyers use
        — verify terms yourself; we may earn a referral fee at no cost to
        you.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          marginBottom: 8,
        }}
      >
        {[
          {
            name: 'Wise — transfer funds to Japan',
            url: AFFILIATES.wise,
            lang: 'EN / JP',
            focus:
              'Low-cost international transfers in JPY — typically far ' +
              'cheaper than a bank wire for a property payment.',
          },
          {
            name: 'Property inspection (home inspector / 住宅診断)',
            url: 'https://www.jshi.org/',
            lang: 'JP',
            focus:
              'Independent structural / termite inspection before you ' +
              'commit — essential for older akiya.',
          },
          {
            name: 'Judicial scrivener (司法書士)',
            url: 'https://www.shiho-shoshi.or.jp/',
            lang: 'JP',
            focus:
              'Handles the title-transfer registration. Find one via the ' +
              'national association directory.',
          },
        ].map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            style={{
              background: C.white,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              padding: 16,
              textDecoration: 'none',
              color: C.ink,
              fontFamily: sans,
            }}
          >
            <strong style={{ color: C.navy }}>{s.name}</strong>
            <div style={{ fontSize: 12, color: C.red, marginTop: 2 }}>
              {s.lang}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
              {s.focus}
            </div>
          </a>
        ))}
      </div>

      <h2 style={{ fontFamily: serif, color: C.navy, marginTop: 40 }}>
        Bilingual agents & services
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {AGENTS.map((a) => (
          <a
            key={a.name}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            style={{
              background: C.white,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              padding: 16,
              textDecoration: 'none',
              color: C.ink,
              fontFamily: sans,
            }}
          >
            <strong style={{ color: C.navy }}>{a.name}</strong>
            <div style={{ fontSize: 12, color: C.red, marginTop: 2 }}>
              {a.lang}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
              {a.focus}
            </div>
          </a>
        ))}
      </div>

      <h2 style={{ fontFamily: serif, color: C.navy, marginTop: 40 }}>
        All 47 prefecture akiya banks
      </h2>
      <p style={{ fontFamily: sans, color: C.muted, fontSize: 14, marginTop: 0 }}>
        Links open the national 空き家バンク aggregator filtered by
        prefecture. Individual municipalities set their own terms — always
        confirm with the town office.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 8,
        }}
      >
        {PREFECTURES_47.map((p) => (
          <a
            key={p.en}
            href={p.bankUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              background: C.white,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: '10px 12px',
              textDecoration: 'none',
              color: C.navy,
              fontFamily: sans,
              fontSize: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{p.en}</span>
            <span style={{ color: C.muted, fontSize: 13 }} lang="ja">
              {p.ja}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
