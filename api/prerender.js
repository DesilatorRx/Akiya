// Server-side prerender for /listing/:source/:id (Vercel rewrites that
// path here with ?source=&id=). Crawlers and link-preview bots don't run
// JS, so we inject real <title>, description, Open Graph / Twitter tags
// and schema.org JSON-LD into the SPA shell, then let React hydrate and
// take over for human visitors.

export const config = { runtime: 'edge' };

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtYen = (y) =>
  !y || y <= 0 ? 'Free' : '¥' + Number(y).toLocaleString('ja-JP');

export default async function handler(req) {
  const url = new URL(req.url);
  const source = url.searchParams.get('source');
  const id = url.searchParams.get('id');
  const host = req.headers.get('host') || 'akiya-rho.vercel.app';
  const origin = `https://${host}`;

  // SPA shell (static file — not rewritten to this function).
  let shell = '';
  try {
    shell = await (await fetch(`${origin}/index.html`)).text();
  } catch {
    shell = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
  }

  const sUrl = process.env.VITE_SUPABASE_URL;
  const sKey = process.env.VITE_SUPABASE_ANON_KEY;
  let listing = null;
  if (sUrl && sKey && source && id) {
    try {
      const r = await fetch(
        `${sUrl}/rest/v1/listings?select=*&id=eq.${encodeURIComponent(
          `${source}:${id}`
        )}&active=eq.true&limit=1`,
        { headers: { apikey: sKey, Authorization: `Bearer ${sKey}` } }
      );
      const rows = await r.json();
      listing = Array.isArray(rows) && rows[0] ? rows[0] : null;
    } catch {
      listing = null;
    }
  }

  const canonical = `${origin}/listing/${esc(source)}/${esc(id)}`;
  let head;

  if (!listing) {
    head =
      `<title>Listing not found — Akiya Japan</title>` +
      `<meta name="robots" content="noindex">` +
      `<link rel="canonical" href="${canonical}">`;
  } else {
    const title = `${listing.title} — ${fmtYen(listing.price)} | Akiya Japan`;
    const desc =
      `${listing.title} in ${listing.city}, ${listing.prefecture}. ` +
      `${fmtYen(listing.price)}` +
      (listing.size_m2 ? `, building ${listing.size_m2} m²` : '') +
      `. ${String(listing.description || '').slice(0, 150)}`;
    const img = listing.image || `${origin}/og-default.png`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: listing.title,
      image: listing.image ? [listing.image] : [],
      description: String(listing.description || '').slice(0, 300),
      category: 'Real estate — Japanese akiya',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'JPY',
        price: listing.price || 0,
        availability: 'https://schema.org/InStock',
        url: canonical,
      },
      areaServed: `${listing.city}, ${listing.prefecture}, Japan`,
    };

    head =
      `<title>${esc(title)}</title>` +
      `<meta name="description" content="${esc(desc)}">` +
      `<link rel="canonical" href="${canonical}">` +
      `<meta property="og:type" content="website">` +
      `<meta property="og:title" content="${esc(title)}">` +
      `<meta property="og:description" content="${esc(desc)}">` +
      `<meta property="og:url" content="${canonical}">` +
      `<meta property="og:image" content="${esc(img)}">` +
      `<meta property="og:site_name" content="Akiya Japan">` +
      `<meta name="twitter:card" content="summary_large_image">` +
      `<meta name="twitter:title" content="${esc(title)}">` +
      `<meta name="twitter:description" content="${esc(desc)}">` +
      `<meta name="twitter:image" content="${esc(img)}">` +
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
  }

  // Replace the shell's <title> (and append our head tags) in <head>.
  const html = shell
    .replace(/<title>.*?<\/title>/i, '')
    .replace('</head>', `${head}</head>`);

  return new Response(html, {
    status: listing ? 200 : 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=600',
    },
  });
}
