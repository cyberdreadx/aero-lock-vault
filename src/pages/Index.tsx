import { Lock, Shield, DollarSign, Clock, TrendingUp, Zap, ArrowRight, Github, X, FileText, ExternalLink } from "lucide-react";
import { DEPLOYMENT_FEE_USD } from "@/lib/web3/constants";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useGlobalStats } from "@/hooks/useGlobalStats";
import { LockedPoolsTable } from "@/components/home/LockedPoolsTable";
import { AppHeader, Logo } from "@/components/layout/AppHeader";

// a live, verified locker used as the public example
const EXAMPLE_LOCKER = "0x4357ce72925d712e3d9c366ac855c9887e4a9cec";

const SectionLabel = ({ index, children }: { index: string; children: string }) => (
  <h2 className="flex items-center gap-3 font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8 sm:mb-10">
    <span className="text-foreground">{index}</span>
    <span className="h-px w-6 bg-border" aria-hidden />
    {children}
  </h2>
);

const Index = () => {
  const { data: stats, isLoading } = useGlobalStats();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        nav={[
          { label: 'features', to: '#features', anchor: true },
          { label: 'how it works', to: '#how', anchor: true },
          { label: 'pricing', to: '#pricing', anchor: true },
          { label: 'lock tokens', to: '/deploy?type=token' },
          { label: 'pools', to: '#pools', anchor: true },
          { label: 'earn', to: '/affiliates' },
          { label: 'docs', to: '/docs' },
        ]}
        cta={
          <Button asChild size="sm" className="h-9 text-xs px-4">
            <Link to="/lockers">
              launch app <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        }
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-fade-b pointer-events-none" aria-hidden />
        <div className="container relative px-4 sm:px-6 pt-14 pb-12 sm:pt-24 sm:pb-20 lg:pt-28">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-border bg-background mb-6 sm:mb-8 font-mono text-[10px] uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" aria-hidden />
              aerodrome lp locker · base
            </div>

            <h1 className="text-[2.5rem] leading-[1.02] sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 tracking-tighter">
              lock lp tokens.<br />
              claim fees.<br />
              <span className="text-muted-foreground">stay secure.</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-8 sm:mb-10 max-w-xl leading-relaxed">
              lock aerodrome lp tokens indefinitely. trigger 30-day withdrawal countdown when ready. claim fees anytime.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="h-11 text-sm px-6 w-full sm:w-auto">
                <Link to="/deploy">
                  start locking <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 text-sm px-6 w-full sm:w-auto">
                <Link to="/docs">read docs</Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 border border-border bg-background mt-14 sm:mt-20 max-w-5xl mx-auto divide-x divide-border">
            {[
              { value: stats?.totalLockers, label: 'lockers deployed' },
              { value: stats?.totalLocks, label: 'active locks' },
              { value: stats?.lockedAssets, label: 'tokens & pools locked' },
            ].map((stat) => (
              <div key={stat.label} className="p-3 sm:p-6">
                <div className="font-mono tabular text-xl sm:text-3xl lg:text-4xl font-medium mb-1 tracking-tight">
                  {isLoading ? <span className="inline-block h-6 w-10 sm:h-8 sm:w-16 bg-muted animate-pulse" /> : stat.value ?? "—"}
                </div>
                <div className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Locked Pools Table */}
      <section id="pools" className="py-12 sm:py-20 border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <SectionLabel index="01">live lockers</SectionLabel>
            {isLoading ? (
              <div className="border border-border divide-y divide-border">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <LockedPoolsTable pools={stats?.lockers || []} />
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20 border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <SectionLabel index="02">features</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-border">
              {[
                {
                  icon: Shield,
                  title: "indefinite lock + 30-day exit",
                  description: "tokens locked until you trigger withdrawal. then mandatory 30-day countdown begins. cancel anytime.",
                },
                {
                  icon: DollarSign,
                  title: "claim lp fees",
                  description: "aerodrome pays lp fees separately from the lp tokens. keep claiming them while your liquidity stays locked.",
                },
                {
                  icon: Lock,
                  title: "token locks",
                  description: "lock team or treasury tokens too - same 30-day public notice before anything can move.",
                },
                {
                  icon: TrendingUp,
                  title: "top-up locks",
                  description: "add more lp tokens to existing locks without resetting timer.",
                },
                {
                  icon: Clock,
                  title: "full control",
                  description: "trigger, cancel, and withdraw. you own your liquidity.",
                },
                {
                  icon: Zap,
                  title: "real-time fees",
                  description: "update and track claimable fees on demand.",
                },
              ].map((feature, i) => (
                <div key={i} className="group border-r border-b border-border p-5 sm:p-6 hover:bg-muted/40 transition-colors">
                  <span className="mb-4 flex h-8 w-8 items-center justify-center border border-border group-hover:bg-foreground group-hover:text-background transition-colors">
                    <feature.icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold mb-1.5 tracking-tight">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 sm:py-20 border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <SectionLabel index="03">why lock liquidity?</SectionLabel>

            <div className="space-y-8">
              <div>
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tighter">
                  prove you're not rugging.
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                  locking lp tokens is the #1 way to show your community you're serious. 
                  when liquidity is locked, you can't suddenly pull it and disappear. 
                  it's verifiable proof of commitment.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border">
                <div className="bg-background p-5 sm:p-6">
                  <div className="font-mono text-3xl sm:text-4xl font-medium mb-2 tracking-tight">30d</div>
                  <div className="text-xs text-muted-foreground">
                    minimum warning before any withdrawal. community sees it coming.
                  </div>
                </div>
                <div className="bg-background p-5 sm:p-6">
                  <div className="font-mono text-3xl sm:text-4xl font-medium mb-2 tracking-tight">100%</div>
                  <div className="text-xs text-muted-foreground">
                    transparent on-chain. anyone can verify locks on basescan.
                  </div>
                </div>
                <div className="bg-background p-5 sm:p-6">
                  <div className="font-mono text-3xl sm:text-4xl font-medium mb-2 tracking-tight">0</div>
                  <div className="text-xs text-muted-foreground">
                    zero chance of instant rugpull. your community can trade safely.
                  </div>
                </div>
              </div>

              <div className="border-l-2 border-border pl-6 py-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  locked liquidity is standard practice for legitimate defi projects. 
                  no lock = red flag. investors check this first. 
                  show them the lock, earn their trust.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="py-12 sm:py-20 border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <SectionLabel index="04">how it works</SectionLabel>

            <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  num: "01",
                  title: "connect wallet",
                  description: "web3 wallet with aerodrome lp tokens"
                },
                {
                  num: "02",
                  title: "create lock",
                  description: "tokens are locked indefinitely until you trigger withdrawal"
                },
                {
                  num: "03",
                  title: "manage",
                  description: "claim fees anytime. when ready, trigger 30-day withdrawal countdown"
                },
                {
                  num: "04",
                  title: "withdraw",
                  description: "after countdown expires, withdraw tokens. cancel trigger anytime before expiry"
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-5 bg-background p-5 sm:flex-col sm:gap-6 sm:p-6 group">
                  <div className="font-mono text-3xl sm:text-4xl font-medium text-muted-foreground/30 group-hover:text-foreground transition-colors">
                    {item.num}
                  </div>
                  <div className="flex-1 pt-1 sm:pt-0">
                    <h3 className="text-sm font-semibold mb-1 tracking-tight">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12 sm:py-20 border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <SectionLabel index="05">pricing</SectionLabel>
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter">
                ${DEPLOYMENT_FEE_USD} flat. <span className="text-muted-foreground">no cut of your liquidity.</span>
              </h3>
            </div>

            <div className="border border-border bg-card overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    {['', 'cost', 'claim lp fees while locked', 'getting liquidity back'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="bg-foreground/[0.03]">
                    <td className="px-4 py-3 font-semibold">aerolock</td>
                    <td className="px-4 py-3 font-mono">${DEPLOYMENT_FEE_USD} per locker, 0% cut</td>
                    <td className="px-4 py-3 text-success">yes, anytime</td>
                    <td className="px-4 py-3">30-day public notice</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">typical % locker</td>
                    <td className="px-4 py-3 font-mono">~0.1 ETH + 1% of lp</td>
                    <td className="px-4 py-3 text-muted-foreground">varies</td>
                    <td className="px-4 py-3">fixed unlock date</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">burning lp</td>
                    <td className="px-4 py-3 font-mono">gas only</td>
                    <td className="px-4 py-3 text-destructive">no, fees are gone</td>
                    <td className="px-4 py-3">never</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
              percentage-locker pricing based on published fee schedules for aerodrome lp on base (aug 2026); check each provider for current terms.
              aerodrome v2 pools pay trading fees separately from the lp tokens, so they must be claimed - aerolock lets the owner claim them while the lp stays locked.
            </p>
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="py-12 sm:py-20 border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="border border-border bg-card p-5 sm:p-8">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
                open source &amp; verified
              </h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-2xl leading-relaxed">
                every locker runs the same open-source contract, with its source verified on basescan and sourcify.
                nothing is upgradeable and there is no platform admin key: only the locker&apos;s owner can act on it,
                and withdrawals always require 30 days&apos; public notice.
              </p>
              <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
                <Button asChild variant="outline" size="sm" className="h-9 text-xs px-3">
                  <a href={`https://basescan.org/address/${EXAMPLE_LOCKER}#code`} target="_blank" rel="noopener noreferrer">
                    example on basescan <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 text-xs px-3">
                  <a href={`https://repo.sourcify.dev/8453/${EXAMPLE_LOCKER}`} target="_blank" rel="noopener noreferrer">
                    sourcify <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 text-xs px-3">
                  <Link to="/docs#security">security details</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-3 tracking-tighter">
              ready to lock?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-8">
              join the degens securing their aerodrome positions
            </p>
            <Button asChild className="h-11 text-sm px-8 w-full sm:w-auto">
              <Link to="/lockers">
                launch app <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 pb-safe">
        <div className="container px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Logo />
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                base・aerodrome
              </div>
              <div className="flex items-center gap-1">
                <Link to="/docs" aria-label="docs" className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <FileText className="h-4 w-4" />
                </Link>
                <a href="https://github.com/cyberdreadx/aero-lock-vault" target="_blank" rel="noopener noreferrer" aria-label="github" className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="h-4 w-4" />
                </a>
                <a href="https://x.com/aerolockvault" target="_blank" rel="noopener noreferrer" aria-label="x" className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
