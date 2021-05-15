import { memoize } from 'lodash';

import {
  Action,
  ActionError,
  ActionResult,
  Either,
  GetDoc,
  SnapshotOfTriggerType,
  TriggerType,
} from './type';

export async function handleTrigger<T extends TriggerType>({
  snapshot,
  actions,
  getDoc,
}: {
  readonly actions: readonly Action<T>[];
  readonly snapshot: SnapshotOfTriggerType<T>;
  readonly getDoc: GetDoc;
}): Promise<void> {
  const memoizedGetDoc = memoize(getDoc);
  return (
    // execute actions
    Promise.all(actions.map((action) => action({ getDoc: memoizedGetDoc, snapshot })))
      // write document updates
      .then((updates) => {
        const actionResults = updates.reduce<Either<readonly ActionResult[], ActionError>>(
          (prev, current) => {
            if (prev.tag === 'left') return prev;
            if (current.tag === 'left') return current;
            return { tag: 'right', value: [...prev.value, current.value] };
          },
          { tag: 'right', value: [] }
        );
        if (actionResults.tag === 'left') return actionResults;
        return {
          tag: 'right',

        }
        // Promise.allSettled(

        // chain(updates)
        //   .reduce(merge)
        //   .flatMap((col, colName) =>
        //     map(col, (doc, id) => writeDocument({ col: colName, id }, doc))
        //   )
        //   .value()
        // )
      })
      // log results
      .then((results) => {
        forEach(results, (result) =>
          result.status === 'rejected'
            ? functions.logger.warn('Kira warning', { snapshot, eventContext, result })
            : noop
        );
      })
  );
}
