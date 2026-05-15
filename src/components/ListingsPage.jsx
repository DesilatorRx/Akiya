import { useEffect, useMemo, useState } from 'react';
import { C, serif, sans } from '../theme.js';
import { CONDITIONS } from '../data/listings.js';
import { getListings, getListingsNear } from '../lib/listings.js';
import { formatYen, formatUsd, m2ToSqft } from '../lib/taxes.js';
import { nearestCoastKm } from '../lib/place.js';
import { displayTitle } from '../lib/format.js';
import { Link } from 'react-router-dom';

const SQFT = [
  { id: 'any', label: 'Any size', min: 0, max: Infinity },
  { id: 's', label: 'Under 800 sq ft', min: 0, max: 800 },
  { id: 'm', label: '800–1,500 sq ft', min: 800, max: 1500 },
  { id: 'l', label: '1,500–3,000 sq ft', min: 1500, max: 3000 },
  { id: 'xl', label: '3,000+ sq ft', min: 3000, max: Infinity },
];
// Distance from the town to the sea (approximate — town-level coords +
// sampled coastline; the "~" is intentional, it's not house-exact).
const OCEAN = [
  { id: 'any', label: 'Any distance to sea', km: Infinity },
  { id: 'walk', label: '🌊 Walkable to sea (~2 km)', km: 2 },
  { id: 'bike', label: 'Very close to sea (~5 km)', km: 5 },
  { id: 'short', label: 'Short drive to sea (~10 km)', km: 10 },
  { id: 'coast', label: 'Coastal area (~20 km)', km: 20 },
  { id: 'near', label: 'Near the sea (~50 km)', km: 50 },
];
const TOWN = [
  { id: 'any', label: 'Any town size', min: 0, max: Infinity },
  { id: 'village', label: 'Village (< 10k)', min: 0, max: 10000 },
  { id: 'smalltown', label: 'Small town (10k–50k)', min: 10000, max: 50000 },
  { id: 'town', label: 'Town (50k–100k)', min: 50000, max: 100000 },
  { id: 'city', label: 'City (100k–500k)', min: 100000, max: 500000 },
  { id: 'bigcity', label: 'Large city (500k+)', min: 500000, max: Infinity },
];
const PAGE_SIZES = [24, 48, 96];

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
  const [near, setNear] = useState('off');
  const [radiusKm, setRadiusKm] = useState(50);
  const [sqft, setSqft] = useState('any');
  const [ocean, setOcean] = useState('any');
  const [town, setTown] = useState('any');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(24);
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
    const sz = SQFT.find((s) => s.id === sqft);
    const oc = OCEAN.find((o) => o.id === ocean);
    const tw = TOWN.find((t) => t.id === town);
    return all.filter((l) => {
      if (!band.test(l.price)) return false;
      if (condition !== 'any' && l.condition !== condition) return false;
      if (prefecture !== 'any' && l.prefecture !== prefecture) return false;
      if (tw.id !== 'any') {
        if (l.population == null) return false;
        if (l.population < tw.min || l.population >= tw.max) return false;
      }
      if (sz.id !== 'any') {
        if (l.sizeM2 == null) return false; // size unknown -> exclude when filtering
        const ft = m2ToSqft(l.sizeM2);
        if (ft < sz.min || ft >= sz.max) return false;
      }
      if (oc.id !== 'any') {
        const km = nearestCoastKm(l.lat, l.lng);
        if (km == null || km > oc.km) return false;
      }
      return true;
    });
  }, [all, priceBand, condition, prefecture, sqft, ocean, town]);

  // Reset to first page whenever the filtered set changes.
  useEffect(() => {
    setPage(0);
  }, [priceBand, condition, prefecture, sqft, ocean, town, near, radiusKm, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  );

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
          : `${filtered.length.toLocaleString()} matches of ` +
            `${all.length.toLocaleString()} live listings — page ` +
            `${safePage + 1}/${pageCount}. Prices in ¥ (~USD at ¥155).`}
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
        <select
          value={sqft}
          onChange={(e) => setSqft(e.target.value)}
          style={selectStyle()}
        >
          {SQFT.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={ocean}
          onChange={(e) => setOcean(e.target.value)}
          style={selectStyle()}
        >
          {OCEAN.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={town}
          onChange={(e) => setTown(e.target.value)}
          style={selectStyle()}
        >
          {TOWN.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
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
        {paged.map((l) => {
          const cond = CONDITIONS[l.condition];
          return (
            <Link
              key={l.id}
              to={`/listing/${l.id.split(':')[0]}/${encodeURIComponent(
                l.id.split(':').slice(1).join(':')
              )}`}
              style={{
                display: 'block',
                textAlign: 'left',
                textDecoration: 'none',
                color: 'inherit',
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
                  {displayTitle(l)}
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
                  {l.sizeM2
                    ? `${m2ToSqft(l.sizeM2).toLocaleString()} sq ft`
                    : 'size n/a'}
                  {l.bedrooms ? ` · ${l.bedrooms} bd` : ''}
                  {l.yearBuilt ? ` · built ${l.yearBuilt}` : ''}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {!loading && source !== 'unavailable' && filtered.length === 0 && (
        <p style={{ fontFamily: sans, color: C.muted }}>
          No properties match these filters.
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
            margin: '28px 0 8px',
            fontFamily: sans,
            fontSize: 14,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: `1px solid ${C.line}`,
              background: safePage === 0 ? C.cream : C.navy,
              color: safePage === 0 ? C.muted : C.white,
              cursor: safePage === 0 ? 'default' : 'pointer',
              fontWeight: 700,
            }}
          >
            ← Prev
          </button>
          <span style={{ color: C.muted }}>
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: `1px solid ${C.line}`,
              background: safePage >= pageCount - 1 ? C.cream : C.navy,
              color: safePage >= pageCount - 1 ? C.muted : C.white,
              cursor: safePage >= pageCount - 1 ? 'default' : 'pointer',
              fontWeight: 700,
            }}
          >
            Next →
          </button>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={selectStyle()}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
