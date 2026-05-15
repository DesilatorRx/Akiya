import { useMemo, useState } from 'react';
import { C, serif, sans } from '../theme.js';
import { LISTINGS, CONDITIONS, PREFECTURES } from '../data/listings.js';
import { formatYen, formatUsd, m2ToSqft } from '../lib/taxes.js';
import PropertyModal from './PropertyModal.jsx';

const PRICE_BANDS = [
  { id: 'any', label: 'Any price', test: () => true },
  { id: 'free', label: 'Free only', test: (p) => p === 0 },
  { id: 'u3', label: 'Under ¥3M', test: (p) => p > 0 && p < 3_000_000 },
  { id: '3to8', label: '¥3M–¥8M', test: (p) => p >= 3_000_000 && p <= 8_000_000 },
  { id: 'o8', label: 'Over ¥8M', test: (p) => p > 8_000_000 },
];

function selectStyle() {
  return {
    padding: '8px 10px',
    border: `1px solid ${C.line}`,
    borderRadius: 6,
    fontFamily: sans,
    background: C.white,
    fontSize: 14,
  };
}

export default function ListingsPage() {
  const [priceBand, setPriceBand] = useState('any');
  const [condition, setCondition] = useState('any');
  const [prefecture, setPrefecture] = useState('any');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const band = PRICE_BANDS.find((b) => b.id === priceBand);
    return LISTINGS.filter(
      (l) =>
        band.test(l.price) &&
        (condition === 'any' || l.condition === condition) &&
        (prefecture === 'any' || l.prefecture === prefecture)
    );
  }, [priceBand, condition, prefecture]);

  return (
    <div>
      <h1
        style={{
          fontFamily: serif,
          color: C.navy,
          fontSize: 32,
          marginBottom: 4,
        }}
      >
        Vacant houses across Japan
      </h1>
      <p style={{ fontFamily: sans, color: C.muted, marginTop: 0 }}>
        {filtered.length} of {LISTINGS.length} demo properties. Prices in
        Japanese yen with a USD estimate at ¥155/USD.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          margin: '16px 0 24px',
        }}
      >
        <select
          value={priceBand}
          onChange={(e) => setPriceBand(e.target.value)}
          style={selectStyle()}
        >
          {PRICE_BANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          style={selectStyle()}
        >
          <option value="any">Any condition</option>
          {Object.entries(CONDITIONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          value={prefecture}
          onChange={(e) => setPrefecture(e.target.value)}
          style={selectStyle()}
        >
          <option value="any">Any prefecture</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        {filtered.map((l) => {
          const cond = CONDITIONS[l.condition];
          return (
            <button
              key={l.id}
              onClick={() => setSelected(l)}
              style={{
                textAlign: 'left',
                background: C.white,
                border: `1px solid ${C.line}`,
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                fontFamily: sans,
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={l.image}
                  alt={l.title}
                  style={{ width: '100%', height: 180, objectFit: 'cover' }}
                />
                {l.isFree && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: C.red,
                      color: C.white,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 999,
                    }}
                  >
                    FREE
                  </span>
                )}
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: cond.color,
                    color: C.white,
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {cond.label}
                </span>
              </div>
              <div style={{ padding: 16 }}>
                <h3
                  style={{
                    margin: '0 0 4px',
                    fontFamily: serif,
                    color: C.navy,
                    fontSize: 18,
                  }}
                >
                  {l.title}
                </h3>
                <div style={{ color: C.muted, fontSize: 13 }}>
                  {l.city}, {l.prefecture}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: l.isFree ? C.red : C.navy,
                    }}
                  >
                    {formatYen(l.price)}
                  </span>
                  <span style={{ color: C.muted, fontSize: 12 }}>
                    {!l.isFree && formatUsd(l.price)}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: C.muted,
                    borderTop: `1px solid ${C.line}`,
                    paddingTop: 8,
                  }}
                >
                  {m2ToSqft(l.sizeM2).toLocaleString()} sq ft · {l.bedrooms} bd ·
                  built {l.yearBuilt}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ fontFamily: sans, color: C.muted }}>
          No properties match these filters.
        </p>
      )}

      {selected && (
        <PropertyModal
          listing={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
