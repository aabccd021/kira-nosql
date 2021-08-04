import { ActionTrigger, TriggerSnapshot } from './type';

/**
 *
 * @param actionTrigger
 * @returns
 */
export function isTriggerRequired<S extends TriggerSnapshot>(
  actionTrigger: ActionTrigger<S>
): boolean {
  return actionTrigger.getTransactionCommits.length > 0 || actionTrigger.propagationOps.length > 0;
}
