import { decodeEventLog } from 'viem';
import { TIMELOCK_FACTORY_ABI, TIMELOCK_FACTORY_ADDRESS } from './artifacts';

type RawLog = { address: string; data: `0x${string}`; topics: [`0x${string}`, ...`0x${string}`[]] };

/** Vaults (LockCreated) and team batch id (BatchCreated) emitted by the factory in a receipt. */
export function factoryEvents(logs: unknown): { vaults: `0x${string}`[]; batchId?: number } {
  const out: { vaults: `0x${string}`[]; batchId?: number } = { vaults: [] };
  for (const log of logs as RawLog[]) {
    if (log.address.toLowerCase() !== TIMELOCK_FACTORY_ADDRESS.toLowerCase()) continue;
    try {
      const event = decodeEventLog({ abi: TIMELOCK_FACTORY_ABI, data: log.data, topics: log.topics }) as { eventName: string; args: unknown };
      if (event.eventName === 'LockCreated') out.vaults.push((event.args as { vault: `0x${string}` }).vault);
      if (event.eventName === 'BatchCreated') out.batchId = Number((event.args as { batchId: bigint }).batchId);
    } catch {
      // not one of ours
    }
  }
  return out;
}
