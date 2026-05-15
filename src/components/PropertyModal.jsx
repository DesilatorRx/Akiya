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

export default function PropertyModal({ listing, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (!listing) return null;
  const cond = CONDITIONS[listing.condition];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,31,60,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 24,
        overflowY: 'auto',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.cream,
          borderRadius: 12,
          maxWidth: 760,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={listing.image}
            alt={listing.title}
            style={{ width: '100%', height: 280, objectFit: 'cover' }}
          />
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: C.navy,
              color: C.white,
              border: 'none',
              width: 36,
              height: 36,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 18,
            }}
            aria-label="Close"
          >
            ×
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
                {listing.title}
              </h2>
              <div style={{ color: C.muted, fontFamily: sans, marginTop: 4 }}>
                {listing.city}, {listing.prefecture}
              </div>
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
            {listing.description}
          </p>

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
              value={`${m2ToSqft(listing.sizeM2).toLocaleString()} sq ft`}
              sub={`(${listing.sizeM2} m²)`}
            />
            <Stat
              label="Land"
              value={`${m2ToSqft(listing.landM2).toLocaleString()} sq ft`}
              sub={`(${listing.landM2} m²)`}
            />
            <Stat label="Bedrooms" value={listing.bedrooms} />
            <Stat label="Year built" value={listing.yearBuilt} />
          </div>

          <TaxCalculator listing={listing} />
          <Advisor listing={listing} />
        </div>
      </div>
    </div>
  );
}
