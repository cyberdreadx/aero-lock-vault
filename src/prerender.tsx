// Build-time renderer used by scripts/prerender.mjs: turns static pages into HTML so
// crawlers (search engines, comparison sites) can read them. The browser app replaces
// this markup when it starts, so it only needs to be readable, not interactive.
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Logo } from '@/components/layout/AppHeader';
import { DocsContent } from '@/pages/Docs';
import Index from '@/pages/Index';

function StaticHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-6 text-xs text-muted-foreground" aria-label="main">
          <a href="/lockers">lockers</a>
          <a href="/deploy">deploy</a>
          <a href="/docs">docs</a>
        </nav>
      </div>
    </header>
  );
}

const pages: Record<string, () => JSX.Element> = {
  '/': () => (
    <QueryClientProvider client={new QueryClient()}>
      <Index />
    </QueryClientProvider>
  ),
  '/docs': () => (
    <div className="min-h-screen bg-background text-foreground">
      <StaticHeader />
      <DocsContent prerender />
    </div>
  ),
};

export const routes = Object.keys(pages);

export function render(route: string): string {
  const Page = pages[route];
  return renderToString(
    <StaticRouter location={route}>
      <Page />
    </StaticRouter>,
  );
}
