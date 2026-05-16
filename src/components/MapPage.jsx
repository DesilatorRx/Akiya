import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { C, serif, sans } from '../theme.js';
import { getListings } from '../lib/listings.js';
import { displayTitle } from '../lib/format.js';
import { formatYen } from '../lib/taxes.js';

// Listings are geocoded to the town centre (akiya banks publish district,
// not parcel, addresses) — so we plot ONE marker per town with a count
// badge rather than fake parcel-level precision.
function groupByTown(listings) {
  const m = new Map();
  for (const l of listings) {
    if (l.lat == null || l.lng == null) continue;
    const key = `${l.lat.toFixed(3)},${l.lng.toFixed(3)}`;
    let g = m.get(key);
    if (!g) {
      g = {
        key,
        lat: l.lat,
        lng: l.lng,
        city: l.city,
        prefecture: l.prefecture,
        items: [],
      };
      m.set(key, g);
    }
    g.items.push(l);
  }
  return [...m.values()];
}

function badgeIcon(n) {
  const size = n >= 100 ? 46 : n >= 25 ? 40 : n >= 5 ? 34 : 28;
  return L.divIcon({
    className: '',
    html:
      `<div style="width:${size}px;height:${size}px;border-radius:50%;` +
      `background:${C.red};color:#fff;display:flex;align-items:center;` +
      `justify-content:center;font:700 13px/1 ${sans};` +
      `border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function MapPage() {
  const [state, setState] = useState({ loading: true, towns: [], source: null });

  useEffect(() => {
    let alive = true;
    getListings().then(({ listings, source }) => {
      if (!alive) return;
      setState({ loading: false, towns: groupByTown(listings), source });
    });
    return () => {
      alive = false;
    };
  }, []);

  const total = useMemo(
    () => state.towns.reduce((s, t) => s + t.items.length, 0),
    [state.towns]
  );

  return (
    <div>
      <h1 style={{ fontFamily: serif, color: C.navy, fontSize: 32, marginBottom: 4 }}>
        Map
      </h1>
      <p style={{ fontFamily: sans, color: C.muted, marginTop: 0 }}>
        {state.loading
          ? 'Loading map…'
          : state.source === 'unavailable'
          ? 'Listings are temporarily unavailable.'
          : `${total.toLocaleString()} listings across ${state.towns.length} ` +
            'towns. Pins are town-level (akiya banks list district, not ' +
            'exact, addresses) — click a pin for its properties.'}
      </p>

      <div
        style={{
          height: '70vh',
          minHeight: 420,
          borderRadius: 10,
          overflow: 'hidden',
          border: `1px solid ${C.line}`,
        }}
      >
        <MapContainer
          center={[37.5, 138]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {state.towns.map((t) => (
            <Marker key={t.key} position={[t.lat, t.lng]} icon={badgeIcon(t.items.length)}>
              <Popup>
                <div style={{ fontFamily: sans, minWidth: 200 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: C.navy,
                      marginBottom: 6,
                    }}
                  >
                    {t.city}, {t.prefecture} — {t.items.length} listing
                    {t.items.length === 1 ? '' : 's'}
                  </div>
                  {t.items
                    .slice()
                    .sort((a, b) => a.price - b.price)
                    .slice(0, 6)
                    .map((l) => {
                      const [src, sid] = [
                        l.id.split(':')[0],
                        encodeURIComponent(l.id.split(':').slice(1).join(':')),
                      ];
                      return (
                        <div key={l.id} style={{ marginBottom: 4 }}>
                          <Link
                            to={`/listing/${src}/${sid}`}
                            style={{ color: C.red, textDecoration: 'none' }}
                          >
                            {formatYen(l.price)} — {displayTitle(l)}
                          </Link>
                        </div>
                      );
                    })}
                  {t.items.length > 6 && (
                    <Link
                      to={`/?prefecture=${encodeURIComponent(t.prefecture)}`}
                      style={{ color: C.navy, fontWeight: 700 }}
                    >
                      + {t.items.length - 6} more — browse {t.prefecture} →
                    </Link>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
