export { describeSchedule, fullyUnlockedAt, nextUnlockAt } from './schedule';
import { pairName } from '@/lib/share';

/** "vAMM-X/WETH" -> "X/WETH LP"; plain tokens keep their symbol. */
export function pairLabel(symbol: string, isLP: boolean): string {
  return isLP ? `${pairName(symbol)} LP` : symbol;
}
