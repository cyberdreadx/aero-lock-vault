// Link previews for /locked/<locker>: when a link-preview bot (X, Telegram, Discord, …)
// fetches a lock page, swap the generic site tags for this lock's live title, text and
// card image. Everyone else gets the normal app untouched.
import { describe, readLockCardData } from './_lib/lock-data.ts';

const PREVIEW_BOTS =
  /(twitterbot|facebookexternalhit|facebot|telegrambot|discordbot|slackbot|linkedinbot|whatsapp|redditbot|embedly|skypeuripreview|pinterest|iframely|mastodon|bluesky|cardyb|googlebot|bingbot|applebot|vkshare|signal)/i;

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Sets <meta {attr}="{key}" content="…"> - replacing it if present, adding it otherwise. */
function setMeta(html: string, attr: 'name' | 'property', key: string, value: string): string {
  const tag = `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`;
  const existing = new RegExp(`<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'i');
  return existing.test(html) ? html.replace(existing, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  if (!PREVIEW_BOTS.test(request.headers.get('user-agent') ?? '')) return;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/locked\/(0x[0-9a-fA-F]{40})\/?$/);
  if (!match) return;

  const [page, data] = await Promise.all([context.next(), readLockCardData(match[1])]);
  if (!data || !page.headers.get('content-type')?.includes('text/html')) return page;

  const { title, description } = describe(data);
  // status/amount in the image URL so previews refresh when the lock changes
  const image = `${url.origin}/og/locked/${data.locker}.png?v=${data.status}-${encodeURIComponent(data.amount)}`;
  const pageUrl = `${url.origin}/locked/${data.locker}`;

  let html = await page.text();
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(title)}</title>`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', pageUrl);
  html = setMeta(html, 'property', 'og:image', image);
  html = setMeta(html, 'property', 'og:image:width', '1200');
  html = setMeta(html, 'property', 'og:image:height', '630');
  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:site', '@aerolockvault');
  html = setMeta(html, 'name', 'twitter:url', pageUrl);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', image);
  html = setMeta(html, 'name', 'twitter:image:alt', title);

  const headers = new Headers(page.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'public, max-age=300');
  return new Response(html, { status: page.status, headers });
};

export const config = { path: '/locked/*' };
