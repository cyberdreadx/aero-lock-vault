export const AERODROME = {
  FACTORY: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
  ROUTER: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
} as const;

export const BASE_SCAN_URL = 'https://basescan.org';

export const TIMELOCK_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

export const DEPLOYMENT_FEE_ORIGINAL_USD = 150; // Original price
export const DEPLOYMENT_FEE_USD = 75; // Discounted price for new users (50% off)
export const TREASURY_ADDRESS = '0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e' as const;

// Wallets that can deploy without paying the deployment fee
export const ADMIN_WALLETS: string[] = [
  TREASURY_ADDRESS,
];

export function isAdminWallet(address?: string): boolean {
  if (!address) return false;
  return ADMIN_WALLETS.some((a) => a.toLowerCase() === address.toLowerCase());
}
