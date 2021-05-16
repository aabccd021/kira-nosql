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

function mergeActionResult(a1: ActionResult, a2: ActionResult): ActionResult {
  return {
    ...a2,
    ...Object.fromEntries(
      Object.entries(a1).map(([colName, col]) => {
        const col2 = a2[colName] ?? {};
        return [
          colName,
          {
            ...col2,
            ...Object.fromEntries(
              Object.entries(col).map(([docId, docData]) => {
                const docData2 = col2[docId] ?? {};
                // NOTE: merge doc data, assuming there are no overlapping fields
                return [docId, { ...docData2, ...docData }];
              })
            ),
          },
        ];
      })
    ),
  };
}

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
  return Promise.all(actions.map((action) => action({ getDoc, snapshot }))).then((updates) => {
    const actionResult = updates.reduce<Either<ActionResult, ActionError | GDE>>(
      (prev, current) => {
        if (prev.tag === 'left') return prev;
        if (current.tag === 'left') return current;
        return { tag: 'right', value: mergeActionResult(prev.value, current.value) };
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
  });
}
