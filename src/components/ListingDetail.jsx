import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { C, serif, sans } from '../theme.js';
import { getListingById } from '../lib/listings.js';
import { formatYen } from '../lib/taxes.js';
import PropertyModal from './PropertyModal.jsx';

// Client-side <title>/meta as a fallback. Crawlers get correct tags from
// the api/prerender function; this keeps the tab/title right for users and
// SPA navigations.
function useDocumentMeta(listing) {
  useEffect(() => {
    if (!listing) return;
    const prevTitle = document.title;
    document.title = `${listing.title} — ${formatYen(listing.price)} | Akiya Japan`;
    const m = document.querySelector('meta[name="description"]');
    const prevDesc = m ? m.getAttribute('content') : null;
    if (m) {
      m.setAttribute(
        'content',
        `${listing.title} in ${listing.city}, ${listing.prefecture}. ` +
          `${formatYen(listing.price)}. ${(listing.description || '').slice(0, 140)}`
      );
    }
    return () => {
      document.title = prevTitle;
      if (m && prevDesc != null) m.setAttribute('content', prevDesc);
    };
  }, [listing]);
}

export default function ListingDetail() {
  const { source, sourceId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, listing: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, listing: null });
    getListingById(source, sourceId).then(({ listing }) => {
      if (alive) setState({ loading: false, listing });
    });
    return () => {
      alive = false;
    };
  }, [source, sourceId]);

  useDocumentMeta(state.listing);

  if (state.loading) {
    return (
      <p style={{ fontFamily: sans, color: C.muted }}>Loading listing…</p>
    );
  }

  if (!state.listing) {
    return (
      <div style={{ fontFamily: sans }}>
        <h1 style={{ fontFamily: serif, color: C.navy }}>Listing not found</h1>
        <p style={{ color: C.muted }}>
          This property may have been sold or removed from the akiya bank.
        </p>
        <Link to="/" style={{ color: C.red, fontWeight: 700 }}>
          ← Browse all listings
        </Link>
      </div>
    );
  }

  return (
    <PropertyModal
      listing={state.listing}
      asPage
      onClose={() => navigate('/')}
    />
  );
}
