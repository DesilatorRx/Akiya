import { useEffect, useRef, useState } from 'react';
import { C, serif, sans } from '../theme.js';
import {
  calcTax,
  formatYen,
  formatUsd,
  m2ToSqft,
  ASSESSED_RATIOS,
} from '../lib/taxes.js';
import { CONDITIONS } from '../data/listings.js';
import { nearestShinkansen, cityPopulation } from '../lib/place.js';
import { displayTitle } from '../lib/format.js';
import { Link } from 'react-router-dom';
import { submitLead } from '../lib/leads.js';
import { AFFILIATES } from '../lib/affiliates.js';

const WISE_URL = AFFILIATES.wise;

function BuyingHelp({ listing }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [st, setSt] = useState({ status: 'idle' });

  async function send(e) {
    e.preventDefault();
    if (st.status === 'busy') return;
    setSt({ status: 'busy' });
    const r = await submitLead({ email, message, listing });
    setSt(
      r.ok
        ? { status: 'done' }
        : { status: 'err', msg: r.error }
    );
  }

  return (
    <div
      style={{
        background: C.white,
        border: `2px solid ${C.gold}`,
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        fontFamily: sans,
      }}
    >
      <h4 style={{ margin: '0 0 6px', fontFamily: serif, color: C.navy }}>
        Get help buying this property
      </h4>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: C.muted }}>
        Akiya purchases by overseas buyers are usually cash and handled in
        Japanese. Tell us you're interested and we'll connect you with a
        bilingual buyer's agent for this property.
      </p>

      {st.status === 'done' ? (
        <div style={{ color: '#2e7d32', fontWeight: 700, fontSize: 14 }}>
          ✓ Sent. We'll be in touch about this property by email.
        </div>
      ) : (
        <form onSubmit={send} style={{ display: 'grid', gap: 8 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              padding: 10,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              fontFamily: sans,
            }}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Anything specific? (budget, timeline, questions) — optional"
            rows={2}
            style={{
              padding: 10,
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              fontFamily: sans,
              resize: 'vertical',
            }}
          />
          <button
            type="submit"
            disabled={st.status === 'busy'}
            style={{
              background: C.red,
              color: C.white,
              border: 'none',
              padding: '11px 18px',
              borderRadius: 6,
              fontWeight: 700,
              fontFamily: sans,
              cursor: st.status === 'busy' ? 'default' : 'pointer',
            }}
          >
            {st.status === 'busy' ? 'Sending…' : 'Request help with this house'}
          </button>
          {st.status === 'err' && (
            <div style={{ color: C.red, fontSize: 13 }}>{st.msg}</div>
          )}
        </form>
      )}

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${C.line}`,
          fontSize: 13,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <a
          href={WISE_URL}
          target="_blank"
          rel="noreferrer"
          style={{ color: C.red, fontWeight: 700, textDecoration: 'none' }}
        >
          💸 Send funds to Japan (Wise) ↗
        </a>
        <Link
          to="/get-started"
          style={{ color: C.red, fontWeight: 700, textDecoration: 'none' }}
        >
          🤝 Bilingual agents & buying guide →
        </Link>
      </div>
    </div>
  );
}

// Best Google Maps target: the Japanese street address from the
// description (Google geocodes it precisely) > the city-level
// coordinates > a city/prefecture text search.
function googleMapsUrl(listing) {
  const base = 'https://www.google.com/maps/search/?api=1&query=';
  const desc = listing.description || '';
  const lead = desc
    .split(/\s—\s|\.\s|。|Source:/)[0]
    .replace(/\s+/g, '')
    .trim();
  if (/[　-鿿]/.test(lead) && lead.length >= 4) {
    return base + encodeURIComponent(lead);
  }
  if (listing.lat != null && listing.lng != null) {
    return base + `${listing.lat},${listing.lng}`;
  }
  return base + encodeURIComponent(`${listing.city} ${listing.prefecture} Japan`);
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ flex: '1 1 110px' }}>
      <div style={{ fontSize: 12, color: C.muted, fontFamily: sans }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: sans }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
      )}
    </div>
  );
}

function TaxCalculator({ listing }) {
  const [locality, setLocality] = useState(listing.locality || 'typical');
  const [cityPlanning, setCityPlanning] = useState(0.003);
  const t = calcTax(listing.price, { locality, cityPlanningRate: cityPlanning });

  const row = (label, jpy, strong) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: `1px solid ${C.line}`,
        fontWeight: strong ? 700 : 400,
        fontSize: 14,
      }}
    >
      <span>{label}</span>
      <span>
        {formatYen(jpy)}{' '}
        <span style={{ color: C.muted, fontWeight: 400 }}>
          {jpy > 0 ? formatUsd(jpy) : ''}
        </span>
      </span>
    </div>
  );

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        fontFamily: sans,
      }}
    >
      <h4 style={{ margin: '0 0 12px', fontFamily: serif, color: C.navy }}>
        Tax & cost estimator
      </h4>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: 13 }}>
          Locality
          <select
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: 6 }}
          >
            {Object.keys(ASSESSED_RATIOS).map((k) => (
              <option key={k} value={k}>
                {k} ({Math.round(ASSESSED_RATIOS[k] * 100)}% assessed)
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          City Planning Tax rate
          <select
            value={cityPlanning}
            onChange={(e) => setCityPlanning(Number(e.target.value))}
            style={{ display: 'block', marginTop: 4, padding: 6 }}
          >
            <option value={0}>0% (not in urbanization area)</option>
            <option value={0.0015}>0.15%</option>
            <option value={0.003}>0.3% (max)</option>
          </select>
        </label>
      </div>

      {row(
        `Assessed value (${Math.round(
          (t.assessedValue / (listing.price || 1)) * 100
        )}% of price)`,
        t.assessedValue
      )}
      {row('Fixed Asset Tax (1.4% / yr)', t.annual.fixedAsset)}
      {row('City Planning Tax (/ yr)', t.annual.cityPlanning)}
      {row('Recurring total / year', t.annual.total, true)}

      <div style={{ height: 10 }} />

      {t.isFree ? (
        <div style={{ fontSize: 13, color: C.muted }}>
          Free property — acquisition tax, registration tax, stamp duty and
          agent commission are skipped.
        </div>
      ) : (
        <>
          {row('Acquisition Tax (~3%)', t.acquisition.acquisitionTax)}
          {row('Registration Tax (~2%)', t.acquisition.registrationTax)}
          {row('Stamp Duty', t.acquisition.stampDuty)}
          {row('Agent commission (3% + ¥60k +tax)', t.acquisition.agentCommission)}
          {row('One-time acquisition total', t.acquisition.total, true)}
        </>
      )}
    </div>
  );
}

function Advisor({ listing }) {
  const [msgs, setMsgs] = useState([
    {
      role: 'assistant',
      content:
        `Hi — I'm your AI advisor for "${listing.title}" in ${listing.city}, ` +
        `${listing.prefecture}. Ask me about the buying process, renovation, ` +
        `taxes, or whether this property fits your goals.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: 'user', content: text }];
    setMsgs(next);
    setInput('');
    setBusy(true);

    const system =
      'You are a concise, practical advisor for foreign (English-speaking) ' +
      'buyers of Japanese akiya (vacant houses). Be honest about risks: ' +
      'renovation cost, residency requirements, remoteness, resale. ' +
      'Property context: ' +
      JSON.stringify({
        title: listing.title,
        prefecture: listing.prefecture,
        city: listing.city,
        priceYen: listing.price,
        isFree: listing.isFree,
        condition: listing.condition,
        sizeM2: listing.sizeM2,
        landM2: listing.landM2,
        yearBuilt: listing.yearBuilt,
      });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system,
          maxTokens: 700,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.text || data.error || 'No response.',
        },
      ]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: `Request failed: ${e.message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        marginTop: 16,
        fontFamily: sans,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h4
        style={{
          margin: 0,
          padding: 16,
          fontFamily: serif,
          color: C.navy,
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        Ask the AI advisor
      </h4>
      <div
        style={{
          maxHeight: 260,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? C.navy : C.cream,
              color: m.role === 'user' ? C.white : C.ink,
              padding: '8px 12px',
              borderRadius: 10,
              maxWidth: '85%',
              fontSize: 14,
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div style={{ color: C.muted, fontSize: 13 }}>Thinking…</div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="e.g. What would renovation realistically cost?"
          style={{
            flex: 1,
            padding: 10,
            border: `1px solid ${C.line}`,
            borderRadius: 6,
            fontFamily: sans,
          }}
        />
        <button
          onClick={send}
          disabled={busy}
          style={{
            background: C.red,
            color: C.white,
            border: 'none',
            padding: '10px 18px',
            borderRadius: 6,
            cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 700,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// Renders the full property detail. As a modal overlay (browsing) or, with
// asPage, as a standalone page body (shareable /listing/:source/:id route).
export default function PropertyModal({ listing, onClose, asPage = false }) {
  useEffect(() => {
    if (asPage) return;
    const onEsc = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose, asPage]);

  if (!listing) return null;
  const cond = CONDITIONS[listing.condition];

  const outerStyle = asPage
    ? { padding: 0 }
    : {
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,31,60,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 24,
        overflowY: 'auto',
        zIndex: 100,
      };

  return (
    <div
      onClick={asPage ? undefined : onClose}
      style={outerStyle}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.cream,
          borderRadius: 12,
          maxWidth: 760,
          width: '100%',
          margin: asPage ? '0 auto' : undefined,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative' }}>
          {listing.image ? (
            <img
              src={listing.image}
              alt={listing.title}
              style={{ width: '100%', height: 280, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: 160,
                background: C.navy,
              }}
            />
          )}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: C.navy,
              color: C.white,
              border: 'none',
              padding: asPage ? '8px 14px' : 0,
              width: asPage ? 'auto' : 36,
              height: 36,
              borderRadius: asPage ? 18 : '50%',
              cursor: 'pointer',
              fontSize: asPage ? 13 : 18,
              fontFamily: sans,
              fontWeight: 700,
            }}
            aria-label={asPage ? 'Back to listings' : 'Close'}
          >
            {asPage ? '← Back' : '×'}
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: serif,
                  color: C.navy,
                  fontSize: 24,
                }}
              >
                {displayTitle(listing)}
              </h2>
              <div style={{ color: C.muted, fontFamily: sans, marginTop: 4 }}>
                {listing.city}, {listing.prefecture}
              </div>
              <a
                href={googleMapsUrl(listing)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  fontFamily: sans,
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.red,
                  textDecoration: 'none',
                }}
              >
                📍 View on Google Maps ↗
              </a>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: listing.isFree ? C.red : C.navy,
                  fontFamily: sans,
                }}
              >
                {formatYen(listing.price)}
              </div>
              {!listing.isFree && (
                <div style={{ color: C.muted, fontSize: 13 }}>
                  {formatUsd(listing.price)}
                </div>
              )}
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  background: cond.color,
                  color: C.white,
                  fontSize: 12,
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontFamily: sans,
                }}
              >
                {cond.label}
              </span>
            </div>
          </div>

          <p
            style={{
              fontFamily: sans,
              lineHeight: 1.6,
              color: C.ink,
              marginTop: 16,
            }}
          >
            {/* Trailing "Source: <url>" is now a real link below. */}
            {(listing.description || '').replace(
              /\s*Source:\s*https?:\/\/\S+\s*$/i,
              ''
            )}
          </p>

          {(() => {
            const url =
              listing.sourceUrl ||
              ((listing.description || '').match(/https?:\/\/\S+/) || [])[0];
            return url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  marginBottom: 16,
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.red,
                  textDecoration: 'none',
                }}
              >
                View the original listing on the akiya bank ↗
              </a>
            ) : null;
          })()}

          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              background: C.white,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <Stat
              label="Building"
              value={
                listing.sizeM2
                  ? `${m2ToSqft(listing.sizeM2).toLocaleString()} sq ft`
                  : '—'
              }
              sub={listing.sizeM2 ? `(${listing.sizeM2} m²)` : 'not stated'}
            />
            <Stat
              label="Land"
              value={
                listing.landM2
                  ? `${m2ToSqft(listing.landM2).toLocaleString()} sq ft`
                  : '—'
              }
              sub={listing.landM2 ? `(${listing.landM2} m²)` : 'not stated'}
            />
            <Stat label="Bedrooms" value={listing.bedrooms ?? '—'} />
            <Stat label="Year built" value={listing.yearBuilt ?? '—'} />
          </div>

          {(() => {
            const pop = listing.population ?? cityPopulation(listing.city);
            const sk = nearestShinkansen(listing.lat, listing.lng);
            if (!pop && !sk) return null;
            const skText = sk
              ? sk.km <= 1.2
                ? `${sk.name} Shinkansen — walkable, ~${sk.walkMin} min ` +
                  `(≈${sk.km} km)`
                : `${sk.name} Shinkansen — ≈${sk.km} km ` +
                  `(${sk.line} line, straight-line)`
              : null;
            return (
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  background: C.white,
                  border: `1px solid ${C.line}`,
                  borderRadius: 8,
                  padding: 16,
                  marginTop: 12,
                  fontFamily: sans,
                }}
              >
                {pop && (
                  <Stat
                    label="Town population"
                    value={`~${pop.toLocaleString()}`}
                    sub={`${listing.city} (approx. 2024)`}
                  />
                )}
                {sk && (
                  <div style={{ flex: '2 1 240px' }}>
                    <div
                      style={{ fontSize: 12, color: C.muted, fontFamily: sans }}
                    >
                      Nearest Shinkansen
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        fontFamily: sans,
                        lineHeight: 1.4,
                      }}
                    >
                      {skText}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <BuyingHelp listing={listing} />
          <TaxCalculator listing={listing} />
          <Advisor listing={listing} />
        </div>
      </div>
    </div>
  );
}
