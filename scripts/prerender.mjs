// Writes crawler-readable HTML for static pages into dist/ after `vite build`.
// Netlify serves dist/docs/index.html for /docs before the SPA fallback, so bots see
// the real content; browsers load the app as usual, which replaces the markup.
// Never fails the build: on any error the site simply stays a plain SPA.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const SITE = 'https://aerolock.app';
const META = {
  '/': {
    title: 'AeroLock - Secure LP Token Locker for Aerodrome Finance',
    description:
      'Lock Aerodrome LP tokens on Base for a flat fee, keep claiming LP fees while locked, and prove liquidity is safe with a public 30-day withdrawal notice.',
  },
  '/docs': {
    title: 'AeroLock Docs - Locking Aerodrome LP on Base',
    description:
      'How AeroLock works: deploying a locker, locking Aerodrome LP, claiming fees while locked, the 30-day withdrawal notice, pricing, and security.',
  },
};

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function withMeta(html, route) {
  const { title, description } = META[route];
  const url = SITE + (route === '/' ? '/' : route);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeAttr(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace('</head>', `    <link rel="canonical" href="${url}" />\n  </head>`);
}

try {
  execSync('npx vite build --ssr src/prerender.tsx --outDir dist-ssr --logLevel warn', { stdio: 'inherit' });
  const { render, routes } = await import(pathToFileURL(resolve('dist-ssr/prerender.js')).href);
  const template = readFileSync('dist/index.html', 'utf8');

  for (const route of routes) {
    try {
      const body = render(route);
      const html = withMeta(template, route).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
      const out = route === '/' ? 'dist/index.html' : `dist${route}/index.html`;
      mkdirSync(resolve(out, '..'), { recursive: true });
      writeFileSync(out, html);
      console.log(`prerendered ${route} -> ${out} (${body.length} chars)`);
    } catch (error) {
      console.warn(`prerender skipped ${route}:`, error instanceof Error ? error.message : error);
    }
  }
} catch (error) {
  console.warn('prerender skipped:', error instanceof Error ? error.message : error);
} finally {
  rmSync('dist-ssr', { recursive: true, force: true });
}
