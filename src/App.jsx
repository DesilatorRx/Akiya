import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { C, serif, sans } from './theme.js';
import ListingsPage from './components/ListingsPage.jsx';
import GetStartedPage from './components/GetStartedPage.jsx';
import DataSourcesPage from './components/DataSourcesPage.jsx';
import ListingDetail from './components/ListingDetail.jsx';

// Map pulls in Leaflet (~150 kB) — load it only when the route is visited.
const MapPage = lazy(() => import('./components/MapPage.jsx'));

const TABS = [
  { path: '/', label: 'Listings' },
  { path: '/map', label: 'Map' },
  { path: '/get-started', label: 'Get Started' },
  { path: '/data-sources', label: 'Data Sources' },
];

// Fonts are injected at runtime via a <link> rather than committed CSS.
function useGoogleFonts() {
  useEffect(() => {
    const href =
      'https://fonts.googleapis.com/css2?' +
      'family=Noto+Serif+JP:wght@400;600;700&' +
      'family=DM+Sans:wght@400;500;700&display=swap';
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    document.body.style.margin = '0';
    document.body.style.fontFamily = sans;
    document.body.style.background = C.cream;
    document.body.style.color = C.ink;
  }, []);
}

export default function App() {
  useGoogleFonts();
  const { pathname } = useLocation();

  return (
    <div style={{ minHeight: '100vh', background: C.cream }}>
      <header
        style={{
          background: C.navy,
          color: C.white,
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              padding: '18px 0',
              textDecoration: 'none',
              color: C.white,
            }}
          >
            <span style={{ fontFamily: serif, fontSize: 26, fontWeight: 700 }}>
              Akiya<span style={{ color: C.gold }}> Japan</span>
            </span>
            <span
              style={{ fontFamily: serif, fontSize: 18, color: C.gold }}
              lang="ja"
            >
              空き家
            </span>
          </Link>
          <nav style={{ display: 'flex', gap: 4 }}>
            {TABS.map((t) => {
              const active =
                t.path === '/'
                  ? pathname === '/' || pathname.startsWith('/listing')
                  : pathname.startsWith(t.path);
              return (
                <Link
                  key={t.path}
                  to={t.path}
                  style={{
                    background: active ? C.gold : 'transparent',
                    color: active ? C.navy : C.white,
                    padding: '10px 18px',
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: active ? 700 : 500,
                    textDecoration: 'none',
                  }}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route
            path="/map"
            element={
              <Suspense fallback={<p style={{ fontFamily: sans }}>Loading map…</p>}>
                <MapPage />
              </Suspense>
            }
          />
          <Route path="/get-started" element={<GetStartedPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route
            path="/listing/:source/:sourceId"
            element={<ListingDetail />}
          />
          <Route path="*" element={<ListingsPage />} />
        </Routes>
      </main>

      <footer
        style={{
          background: C.navy,
          color: C.gold,
          textAlign: 'center',
          padding: '24px 16px',
          fontSize: 13,
          fontFamily: sans,
          marginTop: 48,
        }}
      >
        Akiya Japan — a buyer's portal for vacant houses in Japan. Listings
        aggregated from municipal akiya banks; verify all figures with the
        originating municipality and a licensed professional.
      </footer>
    </div>
  );
}
