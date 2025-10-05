import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lock, ArrowRight, Shield, Clock, DollarSign, Code, ExternalLink, ChevronLeft } from "lucide-react";
import { TREASURY_ADDRESS, DEPLOYMENT_FEE_USD, TIMELOCK_DURATION } from "@/lib/web3/constants";

const Docs = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-tight">aerolock</span>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                back to home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">documentation</h1>
          <p className="text-muted-foreground text-lg">
            everything you need to know about deploying and managing LP token lockers on aerodrome finance
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            quick start
          </h2>
          <Card className="p-6">
            <ol className="space-y-4 list-decimal list-inside">
              <li className="text-sm">
                <strong>connect your wallet</strong> - click "launch app" and connect your web3 wallet
              </li>
              <li className="text-sm">
                <strong>deploy your locker</strong> - provide your aerodrome LP token address and fee receiver
              </li>
              <li className="text-sm">
                <strong>pay deployment fee</strong> - send ${DEPLOYMENT_FEE_USD} worth of ETH to deploy your custom locker contract
              </li>
              <li className="text-sm">
                <strong>lock your tokens</strong> - transfer LP tokens to your new locker contract
              </li>
              <li className="text-sm">
                <strong>manage & claim</strong> - track your locks and claim LP fees through the dashboard
              </li>
            </ol>
          </Card>
        </section>

        {/* Core Concepts */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            core concepts
          </h2>
          <div className="grid gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3">what is a locker?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                a locker is your own deployed smart contract that holds your aerodrome LP tokens with configurable timelock protection. once deployed, you own and control it completely.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                  <span>each locker is a unique contract address</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                  <span>one locker per LP token pair</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                  <span>you can create multiple locks within one locker</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3">withdrawal timelock</h3>
              <p className="text-sm text-muted-foreground mb-4">
                to withdraw locked tokens, you must first trigger withdrawal, which starts a mandatory {TIMELOCK_DURATION / (24 * 60 * 60)}-day waiting period. this timelock provides security and prevents instant withdrawals.
              </p>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold mb-1">how it works</div>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>trigger withdrawal for your lock</li>
                    <li>wait {TIMELOCK_DURATION / (24 * 60 * 60)} days for timelock to expire</li>
                    <li>withdraw your tokens after timelock completes</li>
                  </ol>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">canceling withdrawal</div>
                  <div className="text-sm text-muted-foreground">
                    if you trigger withdrawal by mistake, you can cancel it before the timelock expires, resetting the lock to its original state
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3">LP fee claiming</h3>
              <p className="text-sm text-muted-foreground">
                while your tokens are locked, they continue earning LP fees from aerodrome. you can claim these fees at any time without affecting your lock status.
              </p>
            </Card>
          </div>
        </section>

        {/* Deployment Process */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code className="h-5 w-5" />
            deployment process
          </h2>
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">step 1: prepare your LP tokens</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  you need aerodrome LP tokens from a liquidity pool on base network. get the contract address of your LP token pair.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">step 2: configure your locker</h3>
                <p className="text-sm text-muted-foreground mb-2">provide the following information:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span><strong>LP token address</strong> - the aerodrome pool contract address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span><strong>fee receiver address</strong> - where LP fees will be sent when claimed</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">step 3: pay deployment fee</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  deployment costs ${DEPLOYMENT_FEE_USD} worth of ETH (paid in ETH). this covers gas costs and platform maintenance.
                </p>
                <p className="text-sm text-muted-foreground">
                  payment is sent to: <code className="text-xs bg-muted px-1 py-0.5 rounded">{TREASURY_ADDRESS}</code>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">step 4: verify & deploy</h3>
                <p className="text-sm text-muted-foreground">
                  our system verifies the payment on-chain before deploying your locker contract. once verified, your locker is deployed and you'll receive the contract address.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Managing Locks */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            managing locks
          </h2>
          <div className="grid gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3">adding more locks</h3>
              <p className="text-sm text-muted-foreground">
                you can create multiple locks within the same locker contract or top up existing locks with additional LP tokens. simply approve and transfer more LP tokens through your locker dashboard.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3">withdrawing tokens</h3>
              <p className="text-sm text-muted-foreground mb-3">
                to withdraw tokens, you must first trigger withdrawal, then wait for the timelock period to complete:
              </p>
              <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground">
                <li>go to your locker details page</li>
                <li>click "trigger withdrawal" for your lock</li>
                <li>wait {TIMELOCK_DURATION / (24 * 60 * 60)} days for the timelock to expire</li>
                <li>click "withdraw" to claim your tokens</li>
              </ol>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3">claiming LP fees</h3>
              <p className="text-sm text-muted-foreground">
                LP fees accumulate while tokens are locked. claim them anytime through your locker dashboard without affecting your lock status. fees are distributed proportionally to all locked positions.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3">canceling withdrawal</h3>
              <p className="text-sm text-muted-foreground">
                if you trigger withdrawal by mistake, you can cancel it any time before the {TIMELOCK_DURATION / (24 * 60 * 60)}-day timelock expires. this resets your lock to its active state and you'll need to trigger withdrawal again when you're ready.
              </p>
            </Card>
          </div>
        </section>

        {/* Technical Details */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code className="h-5 w-5" />
            technical details
          </h2>
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">smart contract</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  each locker is deployed directly from the aerolock app. the locker contracts are:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>non-upgradeable and immutable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>fully owned by the deployer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>identical bytecode across all deployments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>open source and auditable</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">network</h3>
                <p className="text-sm text-muted-foreground">
                  aerolock operates exclusively on base network. make sure your wallet is connected to base mainnet before deploying.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">security</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>on-chain payment verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>timelock protection on withdrawals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>emergency timelock adds extra security layer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>no admin keys or backdoors</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">contract verification</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  all aerolock contracts are deployed using identical bytecode:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-3">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>every locker uses the same source code</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>bytecode can be compared across deployments on basescan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>view any locker on basescan to see the contract details</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  need help verifying your locker on basescan? reach out on <a href="https://x.com/aerolockvault" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">X</a> or <a href="https://github.com/cyberdreadx/aero-lock-vault" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github</a> and we&apos;ll provide the source code and compiler settings.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>what happens to my LP fees while tokens are locked?</AccordionTrigger>
              <AccordionContent>
                your LP tokens continue earning fees from the aerodrome pool while locked. you can claim these fees at any time through the locker dashboard without affecting your lock status.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>can I add more tokens to an existing locker?</AccordionTrigger>
              <AccordionContent>
                yes! you can create multiple locks within the same locker contract or top up existing locks. simply approve and transfer more LP tokens through your locker dashboard.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>how long does it take to withdraw tokens?</AccordionTrigger>
              <AccordionContent>
                you must first trigger withdrawal, which starts a mandatory {TIMELOCK_DURATION / (24 * 60 * 60)}-day waiting period. after the timelock expires, you can withdraw your tokens at any time. this delay provides security and prevents instant withdrawals.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>is the deployment fee refundable?</AccordionTrigger>
              <AccordionContent>
                no, the ${DEPLOYMENT_FEE_USD} deployment fee is non-refundable. it covers gas costs for contract deployment and platform maintenance. make sure to double-check all details before deploying.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>can I transfer ownership of my locker?</AccordionTrigger>
              <AccordionContent>
                the locker contract ownership is tied to the deployer's wallet address. while the contract itself cannot transfer ownership, you control it through your wallet's private keys. always keep your wallet secure.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>which aerodrome pools are supported?</AccordionTrigger>
              <AccordionContent>
                all aerodrome LP tokens on base network are supported. simply provide the LP token contract address when deploying your locker. the system will automatically verify it's a valid aerodrome pool.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger>what happens after the timelock expires?</AccordionTrigger>
              <AccordionContent>
                once the {TIMELOCK_DURATION / (24 * 60 * 60)}-day timelock expires after triggering withdrawal, you can withdraw your tokens at any time through the locker dashboard. there's no expiration - your tokens remain safely in the contract until you choose to complete the withdrawal.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger>how do I share my locked position with others?</AccordionTrigger>
              <AccordionContent>
                each locker has a public showcase page that displays your locked positions. you can share this page link with investors, partners, or community members to prove your liquidity commitment. find the share button in your locker details.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Support */}
        <section className="mb-16">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">need more help?</h2>
            <p className="text-muted-foreground mb-6">
              can't find what you're looking for? reach out to our community
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <a href="https://x.com/aerolockvault" target="_blank" rel="noopener noreferrer">
                  ask on X
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://github.com/cyberdreadx/aero-lock-vault" target="_blank" rel="noopener noreferrer">
                  view on github
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link to="/deploy">
            <Button size="lg" className="gap-2">
              deploy your first locker
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Docs;
