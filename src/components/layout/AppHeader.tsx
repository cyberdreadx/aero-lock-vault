import { useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Lock, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WalletButton } from '@/components/web3/WalletButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';
import { WagmiContext } from 'wagmi';
import { getAccount, watchAccount } from 'wagmi/actions';
import { canUseTimelocks } from '@/lib/web3/constants';

export interface NavItem {
  label: string;
  to: string;
  /** in-page anchor (e.g. "#features") rendered as a plain <a> */
  anchor?: boolean;
}

const APP_NAV: NavItem[] = [
  { label: 'lockers', to: '/lockers' },
  { label: 'deploy', to: '/deploy' },
  { label: 'earn', to: '/affiliates' },
  { label: 'docs', to: '/docs' },
];

interface AppHeaderProps {
  nav?: NavItem[];
  /** extra desktop-only actions shown before the wallet button (also listed in the mobile menu) */
  actions?: ReactNode;
  /** replaces the wallet button, e.g. a "launch app" CTA on the landing page */
  cta?: ReactNode;
  showWallet?: boolean;
}

const linkBase =
  'text-xs lowercase tracking-tight text-muted-foreground hover:text-foreground transition-colors';

function DesktopLink({ item }: { item: NavItem }) {
  if (item.anchor) {
    return (
      <a href={item.to} className={linkBase}>
        {item.label}
      </a>
    );
  }
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => cn(linkBase, isActive && 'text-foreground font-medium')}
    >
      {item.label}
    </NavLink>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2 shrink-0', className)}>
      <span className="flex h-6 w-6 items-center justify-center bg-foreground text-background">
        <Lock className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm font-semibold tracking-tight">aerolock</span>
    </Link>
  );
}

// The connected address, or undefined outside a WagmiProvider (e.g. the build-time prerender).
function useOptionalAddress() {
  const config = useContext(WagmiContext);
  const [address, setAddress] = useState(() => (config ? getAccount(config).address : undefined));
  useEffect(() => (config ? watchAccount(config, { onChange: (account) => setAddress(account.address) }) : undefined), [config]);
  return address;
}

export function AppHeader({ nav: navProp = APP_NAV, actions, cta, showWallet = true }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const address = useOptionalAddress();
  // timed locks are in private beta: only beta wallets get the link
  const nav =
    navProp === APP_NAV && canUseTimelocks(address)
      ? [...APP_NAV.slice(0, 2), { label: 'timed', to: '/timelock' }, ...APP_NAV.slice(2)]
      : navProp;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-6" aria-label="main">
            {nav.map((item) => (
              <DesktopLink key={item.to} item={item} />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">{actions}</div>
          <ThemeToggle className="hidden sm:inline-flex" />
          {cta}
          {showWallet && !cta && <WalletButton />}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" aria-label="open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[85vw] max-w-xs flex-col gap-0 p-0">
              <div className="flex h-14 items-center border-b border-border px-5">
                <SheetTitle className="text-sm font-semibold tracking-tight">menu</SheetTitle>
              </div>
              <nav className="flex flex-col py-2" aria-label="mobile">
                {nav.map((item) =>
                  item.anchor ? (
                    <a
                      key={item.to}
                      href={item.to}
                      onClick={() => setOpen(false)}
                      className="px-5 py-3.5 text-sm hover:bg-muted transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between px-5 py-3.5 text-sm hover:bg-muted transition-colors',
                          isActive && 'font-medium bg-muted/60',
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  ),
                )}
              </nav>
              {actions && (
                <div
                  className="flex flex-col gap-2 border-t border-border p-5 [&_a]:w-full [&_button]:w-full"
                  onClick={() => setOpen(false)}
                >
                  {actions}
                </div>
              )}
              <div className="mt-auto flex items-center justify-between border-t border-border p-5 pb-safe">
                {showWallet ? <WalletButton /> : <span />}
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
