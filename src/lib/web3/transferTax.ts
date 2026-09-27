import { decodeFunctionResult, encodeFunctionData, parseAbi, toHex } from 'viem';
import { baseClient } from '@/lib/web3/baseReads';

const ERC20 = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
]);

export type TransferCheck =
  | { ok: true }
  | { ok: false; reason: 'taxed'; taxPercent: number }
  | { ok: false; reason: 'blocked' };

interface SimulatedCall {
  status: string;
  returnData: `0x${string}`;
}

/**
 * Simulates sending `amount` of `token` from `wallet` (no transaction is sent) and checks
 * how much arrived. The locker records the amount you lock, so tokens that take a fee on
 * transfer - or that block transfers - can't be locked correctly.
 */
export async function checkTransferTax(
  token: `0x${string}`,
  wallet: `0x${string}`,
  amount: bigint,
): Promise<TransferCheck> {
  // a fresh address, so no holder-specific fee exemptions apply
  const probe = toHex(crypto.getRandomValues(new Uint8Array(20)));
  const result = (await baseClient.request({
    // eth_simulateV1 isn't in viem's typed RPC schema for this client
    method: 'eth_simulateV1' as 'eth_call',
    params: [
      {
        blockStateCalls: [
          {
            calls: [
              { from: wallet, to: token, data: encodeFunctionData({ abi: ERC20, functionName: 'transfer', args: [probe, amount] }) },
              { from: wallet, to: token, data: encodeFunctionData({ abi: ERC20, functionName: 'balanceOf', args: [probe] }) },
            ],
          },
        ],
      },
      'latest',
    ] as never,
  })) as unknown as Array<{ calls: SimulatedCall[] }>;

  const [send, balance] = result[0].calls;
  if (send.status !== '0x1' || balance.status !== '0x1') return { ok: false, reason: 'blocked' };
  const received = decodeFunctionResult({ abi: ERC20, functionName: 'balanceOf', data: balance.returnData });
  if (received >= amount) return { ok: true };
  const taxPercent = Number(((amount - received) * 10_000n) / amount) / 100;
  return { ok: false, reason: 'taxed', taxPercent };
}
