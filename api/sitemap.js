// Dynamic sitemap.xml — every active listing + the main pages. Vercel
// rewrites /sitemap.xml here. Submit the URL in Google Search Console.

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const host = req.headers.get('host') || 'akiya-rho.vercel.app';
  const origin = `https://${host}`;
  const sUrl = process.env.VITE_SUPABASE_URL;
  const sKey = process.env.VITE_SUPABASE_ANON_KEY;

  const urls = [
    `${origin}/`,
    `${origin}/get-started`,
    `${origin}/data-sources`,
  ];

  if (sUrl && sKey) {
    try {
      const r = await fetch(
        `${sUrl}/rest/v1/listings?select=id&active=eq.true`,
        { headers: { apikey: sKey, Authorization: `Bearer ${sKey}` } }
      );
      const rows = await r.json();
      for (const row of rows || []) {
        const i = String(row.id).indexOf(':');
        if (i < 0) continue;
        const src = row.id.slice(0, i);
        const sid = encodeURIComponent(row.id.slice(i + 1));
        urls.push(`${origin}/listing/${src}/${sid}`);
      }
    } catch {
      /* fall back to just the main pages */
    }
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls
      .map((u) => `<url><loc>${u}</loc><changefreq>daily</changefreq></url>`)
      .join('') +
    '</urlset>';

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
