import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Shield, Clock, DollarSign, Code, ExternalLink } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { TREASURY_ADDRESS, DEPLOYMENT_FEE_USD, TIMELOCK_DURATION } from "@/lib/web3/constants";

const FAQ_ITEMS = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7', 'item-8'];

/**
 * The docs body. Rendered on its own at build time (scripts/prerender.mjs) so the
 * docs are readable by crawlers; `prerender` opens every FAQ answer for that.
 */
export const DocsContent = ({ prerender = false }: { prerender?: boolean }) => {
  return (
      <div className="container px-4 sm:px-6 lg:px-8 py-10 sm:py-16 max-w-4xl">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter mb-4">documentation</h1>
          <p className="text-muted-foreground text-sm sm:text-lg">
            everything you need to know about deploying and managing LP token lockers on aerodrome finance
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 tracking-tight">
            <ArrowRight className="h-5 w-5" />
            quick start
          </h2>
          <Card className="p-5 sm:p-6">
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
                <strong>lock your tokens</strong> - lock LP tokens into your new locker contract
              </li>
              <li className="text-sm">
                <strong>manage & claim</strong> - track your locks and claim LP fees through the dashboard
              </li>
            </ol>
          </Card>
        </section>

        {/* Core Concepts */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 tracking-tight">
            <Shield className="h-5 w-5" />
            core concepts
          </h2>
          <div className="grid gap-6">
            <Card className="p-5 sm:p-6">
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
                  <span>each locker holds a single aerodrome LP token</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                  <span>you can create multiple locks within one locker</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
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

            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">LP fee claiming</h3>
              <p className="text-sm text-muted-foreground">
                aerodrome v2 pools pay trading fees separately from the LP tokens, so they have to be claimed. while your tokens are locked, the locker keeps earning those fees and you can claim them at any time without affecting your lock status.
              </p>
            </Card>
          </div>
        </section>

        {/* Deployment Process */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 tracking-tight">
            <Code className="h-5 w-5" />
            deployment process
          </h2>
          <Card className="p-5 sm:p-6">
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
                  payment is sent to: <code className="font-mono text-xs bg-muted px-1 py-0.5 break-all">{TREASURY_ADDRESS}</code>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">step 4: deploy</h3>
                <p className="text-sm text-muted-foreground">
                  your wallet deploys the locker contract. aerolock then checks on-chain that the deployment and payment came from your wallet and that the payment covers the fee, adds the locker to your dashboard, and submits its source code for basescan verification.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Managing Locks */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 tracking-tight">
            <Clock className="h-5 w-5" />
            managing locks
          </h2>
          <div className="grid gap-6">
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">adding more locks</h3>
              <p className="text-sm text-muted-foreground">
                you can create multiple locks within the same locker contract or top up existing locks with additional LP tokens. simply approve and transfer more LP tokens through your locker dashboard.
              </p>
            </Card>

            <Card className="p-5 sm:p-6">
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

            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">claiming LP fees</h3>
              <p className="text-sm text-muted-foreground">
                LP fees accumulate while tokens are locked. claim them anytime through your locker dashboard without affecting your lock status. fees are claimed for the whole locker at once and always go to the locker's fee receiver address.
              </p>
            </Card>

            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">canceling withdrawal</h3>
              <p className="text-sm text-muted-foreground">
                if you trigger withdrawal by mistake, you can cancel it any time before the {TIMELOCK_DURATION / (24 * 60 * 60)}-day timelock expires. this resets your lock to its active state and you'll need to trigger withdrawal again when you're ready.
              </p>
            </Card>
          </div>
        </section>

        {/* Technical Details */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 tracking-tight">
            <Code className="h-5 w-5" />
            technical details
          </h2>
          <Card className="p-5 sm:p-6">
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
                    <span>open source, verified on basescan and sourcify</span>
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
                    <span>withdrawals require 30 days' public notice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span>no platform admin key: aerolock can't move, pause or unlock anything</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">contract verification</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  all aerolock lockers are deployed from the same source code, and new lockers are submitted for basescan verification automatically. compiler settings: solidity 0.8.20, optimizer off, evm version shanghai, MIT license.
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
                    <span>access basescan links and verification info from your locker dashboard</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  view your locker details page for direct links to basescan and verification information. for help with manual verification, reach out on <a href="https://x.com/aerolockvault" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">X</a> or <a href="https://github.com/cyberdreadx/aero-lock-vault" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github</a>.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Token locks */}
        <section id="token-locks" className="mb-12 sm:mb-16 scroll-mt-20">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 tracking-tight">
            <Clock className="h-5 w-5" />
            token locks
          </h2>
          <div className="grid gap-6">
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">lock any base token</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                besides aerodrome LP, you can lock plain tokens - team allocations, treasury or marketing wallets - to show holders
                they can't be dumped without warning. token locks use the same locker contract and the same rule as LP locks:
                tokens stay locked until the owner triggers a withdrawal, and then a public {TIMELOCK_DURATION / (24 * 60 * 60)}-day
                countdown runs before anything can move. the countdown is shown live on the lock's public page.
              </p>
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">how it differs from dated locks</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                there's no fixed unlock date or vesting schedule. the owner can give notice at any time, and holders get
                {' '}{TIMELOCK_DURATION / (24 * 60 * 60)} days' warning. if you need a lock that can't end before a set date, this isn't that product.
              </p>
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">tokens that can't be locked</h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>tokens that take a fee on transfers - the locker records the amount sent, not the amount received</li>
                <li>tokens whose transfers are blocked or restricted for your wallet</li>
                <li>aerodrome LP - use an LP lock instead, so you can keep claiming its fees</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">the app checks for all three before you deploy, by simulating a transfer - nothing is sent.</p>
            </Card>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="mb-12 sm:mb-16 scroll-mt-20">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 tracking-tight">
            <Shield className="h-5 w-5" />
            security
          </h2>
          <div className="grid gap-6">
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">what the locker owner can do</h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>lock LP tokens and top up existing locks</li>
                <li>trigger a withdrawal, which starts a public 30-day countdown, and cancel it</li>
                <li>withdraw LP only after that countdown has finished</li>
                <li>change the fee receiver and claim LP fees</li>
                <li>transfer ownership (the new owner must accept), or renounce it, which locks the LP permanently</li>
              </ul>
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">what nobody can do</h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>withdraw LP without the 30-day notice - not the owner, not aerolock</li>
                <li>take the locked LP token through the token-recovery function (it's blocked for the LP token)</li>
                <li>upgrade or change the contract - it has no proxy and no platform admin</li>
                <li>redirect fees anywhere except the locker's fee receiver</li>
              </ul>
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">checking a lock</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                every locker has a public page at <code className="font-mono text-xs bg-muted px-1 py-0.5">aerolock.app/locked/&lt;locker address&gt;</code> showing
                each lock's live status read from base: locked, withdrawal pending (with the date it unlocks), or withdrawable.
                a pending withdrawal can't be hidden - it's on-chain for the full 30 days before any liquidity can leave.
              </p>
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">audit status</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                the locker contract has not had an independent third-party audit yet. its full source is public and verified on
                basescan and sourcify, and it builds on openzeppelin's ownable2step and safeerc20. questions or findings: reach out on{' '}
                <a href="https://x.com/aerolockvault" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">X</a>{' '}
                or open an issue on{' '}
                <a href="https://github.com/cyberdreadx/aero-lock-vault" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">github</a>.
              </p>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl font-bold mb-6">frequently asked questions</h2>
          <Accordion type="multiple" defaultValue={prerender ? FAQ_ITEMS : []} className="w-full">
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
        <section className="mb-12 sm:mb-16">
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
  );
};

const Docs = () => (
  <div className="min-h-screen bg-background text-foreground">
    <AppHeader />
    <DocsContent />
  </div>
);

export default Docs;
