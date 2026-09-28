import { useState } from 'react';
import { useAccount, useSendTransaction, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseClient } from '@/lib/web3/baseReads';

/** Sends a transaction on Base (switching network first) and waits for it to be mined. */
export function useBaseTx() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const [busy, setBusy] = useState<string | null>(null);

  const send = async (
    label: string,
    tx: { to: `0x${string}`; data?: `0x${string}`; value?: bigint },
  ) => {
    setBusy(label);
    try {
      if (chainId !== base.id) await switchChainAsync({ chainId: base.id });
      const hash = await sendTransactionAsync({ ...tx, chainId: base.id });
      const receipt = await baseClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status !== 'success') throw new Error('transaction reverted on-chain');
      return receipt;
    } finally {
      setBusy(null);
    }
  };

  return { send, busy };
}
