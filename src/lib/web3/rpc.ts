// Free public Base RPCs, tried in order. mainnet.base.org alone rate-limits bursts
// (HTTP 429 "over rate limit"), which made balances and stats load wrong until a refresh.
// All of these allow browser requests and support eth_call (incl. Multicall3) and eth_simulateV1.
export const BASE_RPC_URLS = [
  'https://base-rpc.publicnode.com',
  'https://base.drpc.org',
  'https://1rpc.io/base',
  'https://mainnet.base.org',
];
