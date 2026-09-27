// Live lock data for link previews, read straight from Base (same rules as the share page).
import {
  createPublicClient,
  fallback,
  formatUnits,
  http,
  isAddress,
  parseAbi,
} from 'https://esm.sh/viem@2.37.12';
import { base } from 'https://esm.sh/viem@2.37.12/chains';

const RPC_URLS = [
  'https://base-rpc.publicnode.com',
  'https://base.drpc.org',
  'https://1rpc.io/base',
  'https://mainnet.base.org',
];
const AERODROME_FACTORY = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';

const client = createPublicClient({
  chain: base,
  transport: fallback(RPC_URLS.map((url) => http(url, { timeout: 6_000 }))),
});

const LOCKER = parseAbi([
  'function tokenContract() view returns (address)',
  'function getLPBalance() view returns (uint256)',
  'function getAllLockIds() view returns (bytes32[])',
  'function getLockInfo(bytes32 lockId) view returns (address, address, address, uint256, uint256, bool, bool)',
]);
const ERC20 = parseAbi(['function symbol() view returns (string)', 'function decimals() view returns (uint8)']);
const FACTORY = parseAbi(['function isPool(address pool) view returns (bool)']);

export type LockStatus = 'locked' | 'pending' | 'withdrawable' | 'none';

export interface LockCardData {
  locker: string;
  kind: 'lp' | 'token';
  /** display name: "LNCTS/WETH" for LP, "XRGE" for tokens */
  asset: string;
  amount: string;
  status: LockStatus;
  unlocksAt?: Date;
}

function formatAmount(value: bigint, decimals: number): string {
  const n = Number(formatUnits(value, decimals));
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 6 : 2 });
}

export async function readLockCardData(locker: string): Promise<LockCardData | null> {
  if (!isAddress(locker, { strict: false })) return null;
  const address = locker.toLowerCase() as `0x${string}`;
  try {
    const [token, balance, ids] = await Promise.all([
      client.readContract({ address, abi: LOCKER, functionName: 'tokenContract' }),
      client.readContract({ address, abi: LOCKER, functionName: 'getLPBalance' }),
      client.readContract({ address, abi: LOCKER, functionName: 'getAllLockIds' }),
    ]);
    const [symbol, decimals, isPool, infos] = await Promise.all([
      client.readContract({ address: token, abi: ERC20, functionName: 'symbol' }).catch(() => 'tokens'),
      client.readContract({ address: token, abi: ERC20, functionName: 'decimals' }).catch(() => 18),
      client.readContract({ address: AERODROME_FACTORY, abi: FACTORY, functionName: 'isPool', args: [token] }).catch(() => false),
      Promise.all(ids.map((id) => client.readContract({ address, abi: LOCKER, functionName: 'getLockInfo', args: [id] }))),
    ]);

    // same precedence as the share page badge: withdrawable > pending > locked
    const now = Date.now();
    let status: LockStatus = 'none';
    let unlocksAt: Date | undefined;
    for (const info of infos) {
      const [, , , , lockUpEndTime, isLocked, isTriggered] = info;
      if (!isLocked) continue;
      if (isTriggered && lockUpEndTime > 0n) {
        const at = new Date(Number(lockUpEndTime) * 1000);
        if (at.getTime() <= now) status = 'withdrawable';
        else if (status !== 'withdrawable') {
          status = 'pending';
          if (!unlocksAt || at < unlocksAt) unlocksAt = at;
        }
      } else if (status === 'none') {
        status = 'locked';
      }
    }

    return {
      locker: address,
      kind: isPool ? 'lp' : 'token',
      asset: isPool ? String(symbol).replace(/^[sv]AMM-/, '') : String(symbol),
      amount: formatAmount(balance, Number(decimals)),
      status,
      unlocksAt,
    };
  } catch (error) {
    console.error('lock card data failed', locker, error);
    return null;
  }
}

export function describe(d: LockCardData): { title: string; description: string } {
  const what = d.kind === 'lp' ? `${d.asset} LP` : d.asset;
  const date = d.unlocksAt?.toISOString().slice(0, 10);
  switch (d.status) {
    case 'locked':
      return {
        title: `🔒 ${d.amount} ${what} locked on AeroLock`,
        description: "No withdrawal pending. Any withdrawal needs 30 days' public on-chain notice. Verified on Base.",
      };
    case 'pending':
      return {
        title: `⚠️ ${d.amount} ${what} on AeroLock - withdrawal pending`,
        description: `A withdrawal has been triggered and unlocks ${date}. Live status on AeroLock.`,
      };
    case 'withdrawable':
      return {
        title: `⚠️ ${d.amount} ${what} on AeroLock - withdrawable`,
        description: 'The 30-day notice has passed; these funds can now be withdrawn. Live status on AeroLock.',
      };
    default:
      return { title: `${what} locker on AeroLock`, description: 'No active locks right now. Live status on AeroLock.' };
  }
}
