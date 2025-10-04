import { type LockInfo, type LockStatus } from '@/types/web3';
import { formatUnits } from 'viem';

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return parseFloat(formatUnits(amount, decimals)).toLocaleString('en-US', {
    maximumFractionDigits: 6,
  });
}

export function calculateUnlockDate(triggeredAt: bigint): Date | null {
  if (triggeredAt === 0n) return null;
  const unlockTimestamp = Number(triggeredAt) + 30 * 24 * 60 * 60; // 30 days
  return new Date(unlockTimestamp * 1000);
}

export function getLockStatus(lock: LockInfo): LockStatus {
  if (lock.isWithdrawn) return 'withdrawn';
  
  if (lock.withdrawalTriggeredAt > 0n) {
    const unlockDate = calculateUnlockDate(lock.withdrawalTriggeredAt);
    if (unlockDate && unlockDate <= new Date()) {
      return 'unlocked';
    }
    return 'triggered';
  }
  
  return 'active';
}

export function getTimeRemaining(unlockDate: Date | null): string {
  if (!unlockDate) return 'Not triggered';
  
  const now = new Date();
  const diff = unlockDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Ready to withdraw';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}
