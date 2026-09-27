// Public Base RPCs with fallback: mainnet.base.org alone rate-limits bursts (HTTP 429).
import { createPublicClient, fallback, http } from 'https://esm.sh/viem@2.37.12';
import { base } from 'https://esm.sh/viem@2.37.12/chains';

const BASE_RPC_URLS = [
  'https://base-rpc.publicnode.com',
  'https://base.drpc.org',
  'https://1rpc.io/base',
  'https://mainnet.base.org',
];

export function createBaseClient() {
  return createPublicClient({
    chain: base,
    transport: fallback(BASE_RPC_URLS.map((url) => http(url, { timeout: 10_000 }))),
  });
}
