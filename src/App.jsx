import { useEffect, useState } from 'react';
import { C, serif, sans } from './theme.js';
import ListingsPage from './components/ListingsPage.jsx';
import GetStartedPage from './components/GetStartedPage.jsx';
import DataSourcesPage from './components/DataSourcesPage.jsx';

const TABS = [
  { id: 'listings', label: 'Listings' },
  { id: 'get-started', label: 'Get Started' },
  { id: 'data-sources', label: 'Data Sources' },
];

// Fonts are injected at runtime via a <link> rather than committed CSS,
// per project style notes.
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
  const [tab, setTab] = useState('listings');

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
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              padding: '18px 0',
            }}
          >
            <span
              style={{ fontFamily: serif, fontSize: 26, fontWeight: 700 }}
            >
              Akiya<span style={{ color: C.gold }}> Japan</span>
            </span>
            <span
              style={{ fontFamily: serif, fontSize: 18, color: C.gold }}
              lang="ja"
            >
              空き家
            </span>
          </div>
          <nav style={{ display: 'flex', gap: 4 }}>
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    background: active ? C.gold : 'transparent',
                    color: active ? C.navy : C.white,
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
        {tab === 'listings' && <ListingsPage />}
        {tab === 'get-started' && <GetStartedPage />}
        {tab === 'data-sources' && <DataSourcesPage />}
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
        Akiya Japan — a buyer's portal for vacant houses in Japan. Demo data;
        verify all figures with local akiya banks and agents.
      </footer>
    </div>
  );
}
