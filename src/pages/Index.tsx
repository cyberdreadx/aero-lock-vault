import { Lock, Shield, DollarSign, Clock, TrendingUp, Zap, ArrowRight, Github, Twitter, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-tight">aerolock</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 text-xs">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">features</a>
              <a href="#how" className="hidden sm:inline text-muted-foreground hover:text-foreground transition-colors">how it works</a>
              <Button size="sm" className="h-7 text-xs px-3">
                launch app
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 border border-border mb-6 text-[10px] uppercase tracking-wider">
              <Zap className="h-3 w-3" />
              aerodrome lp locker
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 leading-[1.1] tracking-tight">
              lock lp tokens.<br />
              claim fees.<br />
              stay secure.
            </h1>
            
            <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-xl leading-relaxed">
              minimalist lp locker for aerodrome pairs. 30-day timelock. fee claiming. no bs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="h-9 text-xs px-6">
                start locking <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
              <Button variant="outline" className="h-9 text-xs px-6">
                read docs
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-16 sm:mt-20 max-w-3xl mx-auto">
            {[
              { label: "locks", value: "1,234" },
              { label: "tvl", value: "$12.5m" },
              { label: "fees claimed", value: "$234k" },
            ].map((stat, i) => (
              <div key={i} className="border border-border p-4 sm:p-5">
                <div className="text-xl sm:text-2xl font-semibold mb-0.5 tracking-tight">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-8 sm:mb-12">
              features
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
              {[
                {
                  icon: Shield,
                  title: "30-day timelock",
                  description: "trigger withdrawal, wait 30 days, claim. cancel anytime before claiming.",
                },
                {
                  icon: DollarSign,
                  title: "claim lp fees",
                  description: "automatically claim trading fees from locked aerodrome positions.",
                },
                {
                  icon: Lock,
                  title: "multi-lock",
                  description: "create unlimited locks with different parameters per position.",
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
                <div key={i} className="group">
                  <feature.icon className="h-4 w-4 mb-3 transition-transform group-hover:scale-110" />
                  <h3 className="text-sm font-semibold mb-1.5 tracking-tight">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="py-12 sm:py-16 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-8 sm:mb-12">
              how it works
            </h2>

            <div className="space-y-8">
              {[
                {
                  num: "01",
                  title: "connect wallet",
                  description: "web3 wallet with aerodrome lp tokens"
                },
                {
                  num: "02",
                  title: "create lock",
                  description: "specify lp token address and amount"
                },
                {
                  num: "03",
                  title: "manage",
                  description: "claim fees, top-up, trigger withdrawal"
                },
                {
                  num: "04",
                  title: "withdraw",
                  description: "after 30-day timelock, claim your tokens"
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-6 sm:gap-8 group">
                  <div className="text-3xl sm:text-4xl font-bold text-muted-foreground/20 group-hover:text-foreground/40 transition-colors">
                    {item.num}
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-sm font-semibold mb-1 tracking-tight">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contract Section */}
      <section className="py-12 sm:py-16 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="border border-border p-6 sm:p-8">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                verified contract
              </h3>
              <p className="text-xs text-muted-foreground mb-4 font-mono break-all">
                0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px] px-3">
                  view on basescan
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px] px-3">
                  audit report
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-tight">
              ready to lock?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">
              join the degens securing their aerodrome positions
            </p>
            <Button className="h-9 text-xs px-6">
              launch app <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold tracking-tight">aerolock</span>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                base・aerodrome
              </div>
              <div className="flex items-center gap-4">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <FileText className="h-3.5 w-3.5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="h-3.5 w-3.5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Twitter className="h-3.5 w-3.5" />
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
