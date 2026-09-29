import { useQuery } from '@tanstack/react-query';
import { decodeFunctionResult, encodeFunctionData, erc20Abi, getAddress } from 'viem';
import { baseClient, multicallRead } from '@/lib/web3/baseReads';
import { TIMELOCK_FACTORY_ABI, TIMELOCK_FACTORY_ADDRESS, TIMELOCK_VAULT_ABI } from '@/lib/web3/timelock/artifacts';
import { KIND_FROM_INDEX, type Schedule } from '@/lib/web3/timelock/schedule';

const factory = TIMELOCK_FACTORY_ADDRESS as `0x${string}`;
// earlier factories whose locks stay valid; v1 had no team batches but reads the same
const LEGACY_FACTORIES = ['0x07E05724Be95Ea989F66471F822fB489aCFb83ea'] as const;
const KNOWN_FACTORIES = [factory, ...LEGACY_FACTORIES].map((f) => f.toLowerCase());

async function factoryCall<T>(functionName: string, args: unknown[] = [], to: `0x${string}` = factory): Promise<T> {
  const res = await baseClient.call({
    to,
    data: encodeFunctionData({ abi: TIMELOCK_FACTORY_ABI, functionName, args } as never),
  });
  return decodeFunctionResult({ abi: TIMELOCK_FACTORY_ABI, functionName, data: res.data! } as never) as T;
}

/** Whether the timed-lock factory has been deployed yet. */
export function useTimelockFactoryDeployed() {
  return useQuery({
    queryKey: ['timelock-factory-deployed'],
    queryFn: async () => {
      const code = await baseClient.getCode({ address: factory });
      return !!code && code !== '0x';
    },
    staleTime: 15_000,
  });
}

/** What `account` pays to create a lock right now, in wei (live Chainlink price). */
export function useTimelockFee(account?: `0x${string}`, enabled = true) {
  return useQuery({
    queryKey: ['timelock-fee', account],
    enabled: !!account && enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const data = await baseClient.call({
        to: factory,
        data: encodeFunctionData({ abi: TIMELOCK_FACTORY_ABI, functionName: 'feeFor', args: [account!] }),
      });
      return decodeFunctionResult({ abi: TIMELOCK_FACTORY_ABI, functionName: 'feeFor', data: data.data! }) as bigint;
    },
  });
}

/** Vaults created for `owner` across every AeroLock timed-lock factory, newest first. */
export function useTimelockVaults(owner?: `0x${string}`, enabled = true) {
  return useQuery({
    queryKey: ['timelock-vaults', owner],
    enabled: !!owner && enabled,
    queryFn: async () => {
      // a failed read throws so react-query retries, instead of caching "no locks"
      const lists = await Promise.all(
        KNOWN_FACTORIES.map((f) => factoryCall<readonly `0x${string}`[]>('vaultsOf', [owner!], f as `0x${string}`)),
      );
      // current factory first, each newest first
      return lists.flatMap((l) => [...l].reverse());
    },
  });
}

/** What `account` pays for a team batch of `count` locks, in wei. */
export function useTimelockBatchFee(account: `0x${string}` | undefined, count: number) {
  return useQuery({
    queryKey: ['timelock-fee', account, 'batch', count],
    enabled: !!account && count > 0,
    refetchInterval: 30_000,
    queryFn: () => factoryCall<bigint>('feeForBatch', [account!, BigInt(count)]),
  });
}

export interface TeamBatch {
  id: number;
  creator: `0x${string}`;
  createdAt: number;
  label: string;
  vaults: `0x${string}`[];
}

export function useTeamBatch(id?: number) {
  return useQuery({
    queryKey: ['timelock-batch', id],
    enabled: id !== undefined && Number.isInteger(id) && id >= 0,
    queryFn: async (): Promise<TeamBatch | null> => {
      const count = await factoryCall<bigint>('batchCount');
      if (BigInt(id!) >= count) return null;
      const [creator, createdAt, label, vaults] = await factoryCall<[`0x${string}`, bigint, string, readonly `0x${string}`[]]>('batch', [
        BigInt(id!),
      ]);
      return { id: id!, creator, createdAt: Number(createdAt), label, vaults: [...vaults] };
    },
  });
}

/** Team batches `creator` has made, newest first. */
export function useTeamBatchesOf(creator?: `0x${string}`) {
  return useQuery({
    queryKey: ['timelock-batches-of', creator],
    enabled: !!creator,
    queryFn: async () => [...(await factoryCall<readonly bigint[]>('batchesOf', [creator!]))].map(Number).reverse(),
  });
}

/** How much of `token` the factory may pull from `owner`. */
export function useFactoryAllowance(token?: `0x${string}`, owner?: `0x${string}`) {
  return useQuery({
    queryKey: ['allowance', token, owner, factory],
    enabled: !!token && !!owner,
    queryFn: async () => {
      const res = await baseClient.call({
        to: token!,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'allowance', args: [owner!, factory] }),
      });
      return decodeFunctionResult({ abi: erc20Abi, functionName: 'allowance', data: res.data! });
    },
  });
}

export interface VaultInfo {
  address: `0x${string}`;
  genuine: boolean;
  token: `0x${string}`;
  symbol: string;
  decimals: number;
  isLP: boolean;
  owner: `0x${string}`;
  pendingOwner: `0x${string}`;
  feeReceiver: `0x${string}`;
  total: bigint;
  released: bigint;
  releasable: bigint;
  stillLocked: bigint;
  balance: bigint;
  schedule: Schedule;
}

const VAULT_FIELDS = [
  'factory',
  'token',
  'isLP',
  'owner',
  'pendingOwner',
  'feeReceiver',
  'total',
  'released',
  'releasable',
  'stillLocked',
  'schedule',
] as const;

// EIP-1167 minimal proxy runtime pointing at `impl`
const cloneCode = (impl: string) =>
  `0x363d3d373d3d3d363d73${impl.slice(2).toLowerCase()}5af43d82803e903d91602b57fd5bf3`;

export async function readVault(address: `0x${string}`): Promise<VaultInfo | null> {
  const results = await multicallRead([
    ...VAULT_FIELDS.map((fn) => ({
      target: address,
      callData: encodeFunctionData({ abi: TIMELOCK_VAULT_ABI, functionName: fn } as never),
    })),
  ]);
  if (results.some((r) => r === null)) return null;
  const v = Object.fromEntries(
    VAULT_FIELDS.map((fn, i) => [fn, decodeFunctionResult({ abi: TIMELOCK_VAULT_ABI, functionName: fn, data: results[i]! } as never)]),
  ) as Record<(typeof VAULT_FIELDS)[number], unknown>;
  // genuine = made by one of our factories AND running exactly that factory's vault logic
  const vaultFactory = String(v.factory).toLowerCase();
  const impl = KNOWN_FACTORIES.includes(vaultFactory)
    ? await factoryCall<string>('implementation', [], vaultFactory as `0x${string}`).catch(() => null)
    : null;

  const token = v.token as `0x${string}`;
  const [code, meta] = await Promise.all([
    baseClient.getCode({ address }),
    multicallRead([
      { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'symbol' }) },
      { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'decimals' }) },
      { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'balanceOf', args: [address] }) },
    ]),
  ]);
  const s = v.schedule as { kind: number; start: bigint; cliff: bigint; duration: bigint; steps: number };

  return {
    address: getAddress(address),
    genuine: !!impl && code?.toLowerCase() === cloneCode(impl),
    token,
    symbol: meta[0] ? (decodeFunctionResult({ abi: erc20Abi, functionName: 'symbol', data: meta[0] }) as string) : '???',
    decimals: meta[1] ? Number(decodeFunctionResult({ abi: erc20Abi, functionName: 'decimals', data: meta[1] })) : 18,
    balance: meta[2] ? (decodeFunctionResult({ abi: erc20Abi, functionName: 'balanceOf', data: meta[2] }) as bigint) : 0n,
    isLP: v.isLP as boolean,
    owner: v.owner as `0x${string}`,
    pendingOwner: v.pendingOwner as `0x${string}`,
    feeReceiver: v.feeReceiver as `0x${string}`,
    total: v.total as bigint,
    released: v.released as bigint,
    releasable: v.releasable as bigint,
    stillLocked: v.stillLocked as bigint,
    schedule: {
      kind: KIND_FROM_INDEX[s.kind],
      start: Number(s.start),
      cliff: Number(s.cliff),
      duration: Number(s.duration),
      steps: Number(s.steps),
    },
  };
}

export function useVault(address?: `0x${string}`) {
  return useQuery({
    queryKey: ['timelock-vault', address?.toLowerCase()],
    enabled: !!address,
    refetchInterval: 30_000,
    queryFn: () => readVault(address!),
  });
}
