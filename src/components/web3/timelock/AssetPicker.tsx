import { useEffect, useMemo, useState } from 'react';
import { decodeFunctionResult, encodeFunctionData, erc20Abi, formatUnits, isAddress, parseAbi } from 'viem';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useLpPositions } from '@/hooks/web3/useLpPositions';
import { useWalletTokens } from '@/hooks/web3/useWalletTokens';
import { multicallRead } from '@/lib/web3/baseReads';
import { AERODROME } from '@/lib/web3/constants';
import { cn } from '@/lib/utils';

export interface Asset {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  balance: bigint;
  isLP: boolean;
}

const POOL_ABI = parseAbi(['function isPool(address pool) view returns (bool)']);

async function readAsset(token: `0x${string}`, wallet: `0x${string}`): Promise<Asset | null> {
  const r = await multicallRead([
    { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'symbol' }) },
    { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'decimals' }) },
    { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'balanceOf', args: [wallet] }) },
    { target: AERODROME.FACTORY as `0x${string}`, callData: encodeFunctionData({ abi: POOL_ABI, functionName: 'isPool', args: [token] }) },
  ]);
  if (!r[1] || !r[2]) return null;
  return {
    address: token,
    symbol: r[0] ? decodeFunctionResult({ abi: erc20Abi, functionName: 'symbol', data: r[0] }) : '???',
    decimals: decodeFunctionResult({ abi: erc20Abi, functionName: 'decimals', data: r[1] }),
    balance: decodeFunctionResult({ abi: erc20Abi, functionName: 'balanceOf', data: r[2] }),
    isLP: r[3] ? decodeFunctionResult({ abi: POOL_ABI, functionName: 'isPool', data: r[3] }) : false,
  };
}

/** The wallet's LP positions and tokens to choose from, or any token by pasted address. */
export function AssetPicker({ wallet, value, onChange }: { wallet: `0x${string}`; value: Asset | null; onChange: (a: Asset) => void }) {
  const { positions: lps } = useLpPositions(wallet);
  const { tokens } = useWalletTokens(wallet, true);
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    const a = pasted.trim();
    if (!isAddress(a, { strict: false })) return;
    readAsset(a as `0x${string}`, wallet).then((found) => {
      if (found) onChange(found);
      else toast({ description: "that address isn't a token on base", variant: 'destructive' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasted, wallet]);

  const options: Asset[] = useMemo(
    () => [
      ...(lps ?? []).map((p) => ({ address: p.address, symbol: p.symbol, decimals: p.decimals, balance: p.balance, isLP: true })),
      ...(tokens ?? []).map((t) => ({ address: t.address, symbol: t.symbol, decimals: t.decimals, balance: t.balance, isLP: false })),
    ],
    [lps, tokens],
  );

  return (
    <div className="space-y-2">
      <div className="max-h-56 overflow-y-auto border border-border divide-y divide-border">
        {options.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">no tokens found - paste a contract address below</p>}
        {options.map((o) => (
          <button
            key={o.address}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs transition-colors',
              value?.address === o.address ? 'bg-foreground text-background' : 'hover:bg-muted',
            )}
          >
            <span className="truncate font-medium">
              {o.symbol} {o.isLP && <span className="font-mono text-[10px] opacity-70">· lp</span>}
            </span>
            <span className="font-mono shrink-0 opacity-80">
              {Number(formatUnits(o.balance, o.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span>
          </button>
        ))}
      </div>
      <Input
        placeholder="or paste a token / lp address 0x…"
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        className="font-mono text-base sm:text-xs"
      />
    </div>
  );
}
