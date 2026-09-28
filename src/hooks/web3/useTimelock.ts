import { useQuery } from '@tanstack/react-query';
import { decodeFunctionResult, encodeFunctionData, erc20Abi, getAddress } from 'viem';
import { baseClient, multicallRead } from '@/lib/web3/baseReads';
import { TIMELOCK_FACTORY_ABI, TIMELOCK_FACTORY_ADDRESS, TIMELOCK_VAULT_ABI } from '@/lib/web3/timelock/artifacts';
import { KIND_FROM_INDEX, type Schedule } from '@/lib/web3/timelock/schedule';

const factory = TIMELOCK_FACTORY_ADDRESS as `0x${string}`;

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

/** Vaults created for `owner`, newest first. */
export function useTimelockVaults(owner?: `0x${string}`, enabled = true) {
  return useQuery({
    queryKey: ['timelock-vaults', owner],
    enabled: !!owner && enabled,
    queryFn: async () => {
      const data = await baseClient.call({
        to: factory,
        data: encodeFunctionData({ abi: TIMELOCK_FACTORY_ABI, functionName: 'vaultsOf', args: [owner!] }),
      });
      const vaults = decodeFunctionResult({ abi: TIMELOCK_FACTORY_ABI, functionName: 'vaultsOf', data: data.data! });
      return [...(vaults as readonly `0x${string}`[])].reverse();
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

async function readVault(address: `0x${string}`): Promise<VaultInfo | null> {
  const results = await multicallRead([
    ...VAULT_FIELDS.map((fn) => ({
      target: address,
      callData: encodeFunctionData({ abi: TIMELOCK_VAULT_ABI, functionName: fn } as never),
    })),
    { target: factory, callData: encodeFunctionData({ abi: TIMELOCK_FACTORY_ABI, functionName: 'implementation' }) },
  ]);
  if (results.slice(0, VAULT_FIELDS.length).some((r) => r === null)) return null;
  const v = Object.fromEntries(
    VAULT_FIELDS.map((fn, i) => [fn, decodeFunctionResult({ abi: TIMELOCK_VAULT_ABI, functionName: fn, data: results[i]! } as never)]),
  ) as Record<(typeof VAULT_FIELDS)[number], unknown>;
  const impl = results[VAULT_FIELDS.length]
    ? (decodeFunctionResult({ abi: TIMELOCK_FACTORY_ABI, functionName: 'implementation', data: results[VAULT_FIELDS.length]! }) as string)
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
    // made by our factory AND running exactly our vault logic
    genuine:
      String(v.factory).toLowerCase() === factory.toLowerCase() && !!impl && code?.toLowerCase() === cloneCode(impl),
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
