import { useEffect, useMemo, useState } from 'react';
import { C, serif, sans } from '../theme.js';
import { CONDITIONS } from '../data/listings.js';
import { getListings, getListingsNear } from '../lib/listings.js';
import { formatYen, formatUsd, m2ToSqft } from '../lib/taxes.js';
import PropertyModal from './PropertyModal.jsx';

const PRICE_BANDS = [
  { id: 'any', label: 'Any price', test: () => true },
  { id: 'free', label: 'Free only', test: (p) => p === 0 },
  { id: 'u3', label: 'Under ¥3M', test: (p) => p > 0 && p < 3_000_000 },
  { id: '3to8', label: '¥3M–¥8M', test: (p) => p >= 3_000_000 && p <= 8_000_000 },
  { id: 'o8', label: 'Over ¥8M', test: (p) => p > 8_000_000 },
];

// Anchor points for "near" radius search (city centres).
const ANCHORS = [
  { id: 'off', label: 'Anywhere in Japan' },
  { id: 'tokyo', label: 'Near Tokyo', lat: 35.6762, lng: 139.6503 },
  { id: 'osaka', label: 'Near Osaka', lat: 34.6937, lng: 135.5023 },
  { id: 'kyoto', label: 'Near Kyoto', lat: 35.0116, lng: 135.7681 },
  { id: 'nagano', label: 'Near Nagano', lat: 36.6513, lng: 138.181 },
  { id: 'niigata', label: 'Near Niigata', lat: 37.9026, lng: 139.0236 },
  { id: 'sapporo', label: 'Near Sapporo', lat: 43.0618, lng: 141.3545 },
  { id: 'fukuoka', label: 'Near Fukuoka', lat: 33.5904, lng: 130.4017 },
];
const RADII = [25, 50, 100, 200];

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
  const [near, setNear] = useState('off');
  const [radiusKm, setRadiusKm] = useState(50);
  const [all, setAll] = useState([]);
  const [source, setSource] = useState(null); // 'supabase' | 'demo' | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const anchor = ANCHORS.find((a) => a.id === near);
    const query =
      anchor && anchor.id !== 'off'
        ? getListingsNear(anchor.lat, anchor.lng, radiusKm)
        : getListings();
    query.then(({ listings, source }) => {
      if (!alive) return;
      setAll(listings);
      setSource(source);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [near, radiusKm]);

  // Prefecture options come from the live data so the filter matches what's
  // actually loaded (demo or Supabase).
  const prefectures = useMemo(
    () => [...new Set(all.map((l) => l.prefecture))].sort(),
    [all]
  );

  const filtered = useMemo(() => {
    const band = PRICE_BANDS.find((b) => b.id === priceBand);
    return all.filter(
      (l) =>
        band.test(l.price) &&
        (condition === 'any' || l.condition === condition) &&
        (prefecture === 'any' || l.prefecture === prefecture)
    );
  }, [all, priceBand, condition, prefecture]);

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
        {loading
          ? 'Loading listings…'
          : source === 'unavailable'
          ? 'Listings are temporarily unavailable — please try again shortly.'
          : `${filtered.length} of ${all.length} live listings. Prices in ` +
            'Japanese yen with a USD estimate at ¥155/USD.'}
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
          {prefectures.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={near}
          onChange={(e) => setNear(e.target.value)}
          style={selectStyle()}
        >
          {ANCHORS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        {near !== 'off' && (
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            style={selectStyle()}
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                within {r} km
              </option>
            ))}
          </select>
        )}
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

      {!loading && source !== 'unavailable' && filtered.length === 0 && (
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
