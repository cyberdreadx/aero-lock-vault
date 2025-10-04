import { Lock, Shield, TrendingUp, Zap, ArrowRight, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
                <Lock className="h-6 w-6 text-background" />
              </div>
              <span className="text-2xl font-bold text-gradient">AeroLock</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#stats" className="text-muted-foreground hover:text-foreground transition-colors">Stats</a>
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity glow-primary">
                Launch App
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-primary/20 mb-8 animate-float">
              <Zap className="h-4 w-4 text-primary animate-pulse-glow" />
              <span className="text-sm text-muted-foreground">Secure LP Token Locking for Aerodrome</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Lock Your Liquidity,
              <br />
              <span className="text-gradient">Earn With Confidence</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              The most secure and flexible LP token locker for Aerodrome Finance. Lock tokens, claim fees, and manage your liquidity with advanced timelock controls.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity glow-primary text-lg px-8 py-6">
                Start Locking <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary/50 hover:bg-primary/10 text-lg px-8 py-6">
                View Docs
              </Button>
            </div>
          </div>

          {/* Floating Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto">
            {[
              { icon: Lock, label: "Total Locks", value: "1,234", gradient: "from-primary to-primary/60" },
              { icon: DollarSign, label: "Total Value Locked", value: "$12.5M", gradient: "from-accent to-accent/60" },
              { icon: TrendingUp, label: "Fees Claimed", value: "$234K", gradient: "from-primary to-accent" },
            ].map((stat, i) => (
              <Card key={i} className="p-6 bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/50 transition-all duration-300 hover:scale-105">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${stat.gradient} mb-4`}>
                  <stat.icon className="h-6 w-6 text-background" />
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose <span className="text-gradient">AeroLock</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built specifically for Aerodrome Finance with advanced features and unmatched security
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Secure Timelock",
                description: "30-day withdrawal window with trigger/cancel mechanisms for maximum security and flexibility",
                color: "primary"
              },
              {
                icon: DollarSign,
                title: "Claim LP Fees",
                description: "Automatically claim and distribute trading fees from your locked Aerodrome LP positions",
                color: "accent"
              },
              {
                icon: Lock,
                title: "Multi-Lock Support",
                description: "Create and manage multiple locks with different parameters for diverse strategies",
                color: "primary"
              },
              {
                icon: TrendingUp,
                title: "Top-Up Locks",
                description: "Add more LP tokens to existing locks without resetting the timelock period",
                color: "accent"
              },
              {
                icon: Clock,
                title: "Flexible Management",
                description: "Full control over your locks with trigger, cancel, and withdrawal capabilities",
                color: "primary"
              },
              {
                icon: Zap,
                title: "Real-time Updates",
                description: "Update claimable fees on-demand and track your earnings in real-time",
                color: "accent"
              },
            ].map((feature, i) => (
              <Card key={i} className="p-6 bg-card/50 backdrop-blur-xl border-border/40 hover:border-primary/50 transition-all duration-300 hover:scale-105 group">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color === 'primary' ? 'from-primary to-primary/60' : 'from-accent to-accent/60'} mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-7 w-7 text-background" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple <span className="text-gradient">Process</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Lock your Aerodrome LP tokens in four easy steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: "01",
                title: "Connect Wallet",
                description: "Connect your Web3 wallet containing Aerodrome LP tokens"
              },
              {
                step: "02",
                title: "Create Lock",
                description: "Enter LP token address and amount to lock"
              },
              {
                step: "03",
                title: "Manage & Earn",
                description: "Claim fees, top-up, or trigger withdrawals anytime"
              },
              {
                step: "04",
                title: "Withdraw",
                description: "After 30-day timelock, withdraw your LP tokens"
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary to-accent opacity-30" />
                )}
                <div className="relative bg-card/50 backdrop-blur-xl border border-border/40 rounded-2xl p-6 hover:border-primary/50 transition-all duration-300">
                  <div className="text-6xl font-bold text-gradient mb-4 opacity-20">{item.step}</div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <Card className="max-w-4xl mx-auto p-12 bg-card/80 backdrop-blur-xl border-primary/20 glow-primary">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Ready to Secure Your <span className="text-gradient">Liquidity</span>?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join hundreds of users who trust AeroLock to secure their Aerodrome LP positions
              </p>
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity glow-primary text-lg px-10 py-6">
                Launch App Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Lock className="h-5 w-5 text-background" />
              </div>
              <span className="text-xl font-bold text-gradient">AeroLock</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 AeroLock. Built for Aerodrome Finance.
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Docs</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">GitHub</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
