import { memoize, merge } from 'lodash';

import {
  Action,
  ActionError,
  ActionResult,
  Either,
  GetDoc,
  SnapshotOfTriggerType,
  TriggerType,
  WriteDoc,
} from './type';

export async function handleTrigger<T extends TriggerType, WR, GDE>({
  snapshot,
  actions,
  getDoc,
  writeDoc,
}: {
  readonly actions: readonly Action<T, GDE>[];
  readonly snapshot: SnapshotOfTriggerType<T>;
  readonly getDoc: GetDoc<GDE>;
  readonly writeDoc: WriteDoc<WR>;
}): Promise<Either<Promise<readonly PromiseSettledResult<WR>[]>, ActionError | GDE>> {
  const memoizedGetDoc = memoize(getDoc);
  return Promise.all(actions.map((action) => action({ getDoc: memoizedGetDoc, snapshot }))).then(
    (updates) => {
      const actionResult = updates.reduce<Either<ActionResult, ActionError | GDE>>(
        (prev, current) => {
          if (prev.tag === 'left') return prev;
          if (current.tag === 'left') return current;
          return { tag: 'right', value: merge(prev.value, current.value) };
        },
        { tag: 'right', value: {} }
      );
      if (actionResult.tag === 'left') return actionResult;
      return {
        tag: 'right',
        value: Promise.allSettled(
          Object.entries(actionResult.value).flatMap(([colName, col]) =>
            Object.entries(col).map(([docId, docData]) =>
              writeDoc({ col: colName, id: docId }, docData)
            )
          )
        ),
      };
    }
  );
}
