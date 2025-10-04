export interface LockInfo {
  owner: `0x${string}`;
  lpToken: `0x${string}`;
  amount: bigint;
  lockedAt: bigint;
  withdrawalTriggeredAt: bigint;
  isWithdrawn: boolean;
}

export interface LockWithId extends LockInfo {
  lockId: bigint;
}

export interface TokenMetadata {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  name: string;
}

export type LockStatus = 'active' | 'triggered' | 'unlocked' | 'withdrawn';

export interface ClaimableFees {
  token0: bigint;
  token1: bigint;
  token0Address: `0x${string}`;
  token1Address: `0x${string}`;
}
