import assertNever from 'assert-never';
import { Dictionary, Field } from 'kira-core';

import {
  ActionType,
  ColDrafts,
  DataTypeError,
  DB,
  DocCommit,
  DocKey,
  Draft,
  Either,
  SnapshotOfActionType,
} from '.';
import { ColDraft } from './type';

function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

function getTCAndMFO<A extends ActionType, GDE, WR>({
  triggers,
  colName,
  actionType,
}: {
  readonly triggers: readonly Draft<GDE, WR>[];
  readonly colName: string;
  readonly actionType: A;
}): ColDrafts<A, GDE, WR> {
  const colDrafts = triggers.map(
    (trigger) => trigger[actionType]?.[colName] as ColDraft<A, GDE, WR> | undefined
  );
  return {
    getTransactionCommits: colDrafts.map((x) => x?.getTransactionCommit).filter(isDefined),
    mayFailOps: colDrafts.map((x) => x?.mayFailOp).filter(isDefined),
  };
}

export function getFoo<GDE, WR>({
  triggers,
  colName,
}: {
  readonly triggers: readonly Draft<GDE, WR>[];
  readonly colName: string;
}): {
  readonly onCreate: ColDrafts<'onCreate', GDE, WR>;
  readonly onUpdate: ColDrafts<'onUpdate', GDE, WR>;
  readonly onDelete: ColDrafts<'onDelete', GDE, WR>;
} {
  return {
    onCreate: getTCAndMFO({ triggers, colName, actionType: 'onCreate' }),
    onUpdate: getTCAndMFO({ triggers, colName, actionType: 'onUpdate' }),
    onDelete: getTCAndMFO({ triggers, colName, actionType: 'onDelete' }),
  };
}

export function getTriggers<GDE, WR, F extends Field>({
  cols,
  makeTrigger,
}: {
  readonly cols: Dictionary<Dictionary<F>>;
  readonly makeTrigger: (param: {
    readonly colName: string;
    readonly fieldName: string;
    readonly fieldSpec: F;
  }) => Draft<GDE, WR>;
}): readonly Draft<GDE, WR>[] {
  return Object.entries(cols).flatMap(([colName, col]) =>
    Object.entries(col).map(([fieldName, fieldSpec]) =>
      makeTrigger({ colName, fieldName, fieldSpec })
    )
  );
}

export async function runTrigger<A extends ActionType, GDE, WR>({
  action,
  snapshot,
  db,
}: {
  readonly action: ColDrafts<A, GDE, WR>;
  readonly snapshot: SnapshotOfActionType<A>;
  readonly db: DB<GDE, WR>;
}): Promise<Either<readonly WR[], DataTypeError | GDE>> {
  const tc = await Promise.all(
    action.getTransactionCommits.map((gtc) => gtc({ ...db, snapshot }))
  ).then((eithers) =>
    eithers.reduce(
      (prev, e) => {
        if (prev.tag === 'left') return prev;
        if (e.tag === 'left') return e;
        return {
          tag: 'right',
          value: {
            // merge Transaction commit
            ...e.value,
            ...Object.fromEntries(
              Object.entries(prev.value).map(([colName, col]) => {
                const col2 = e.value[colName] ?? {};
                return [
                  colName,
                  {
                    ...col2,
                    ...Object.fromEntries(
                      // Merge doc operations. Operation priority is delete > merge.
                      Object.entries(col).map<readonly [string, DocCommit]>(([docId, docOp]) => {
                        const docOp2 = col2[docId];
                        if (docOp.op === 'delete' || docOp2?.op === 'delete') {
                          return [docId, { op: 'delete' }];
                        }
                        if (!docOp2) {
                          return [docId, docOp];
                        }
                        /**
                         * If both prev.value and e.value provide merge value for the same field,
                         * value from e.value will be used
                         */
                        return [
                          docId,
                          {
                            op: 'merge',
                            data: { ...docOp.data, ...docOp2.data },
                          },
                        ];
                      })
                    ),
                  },
                ];
              })
            ),
          },
        };
      },
      { tag: 'right', value: {} }
    )
  );
  if (tc.tag === 'left') {
    return tc;
  }
  const result = await Promise.all(
    Object.entries(tc.value).flatMap(([colName, docs]) =>
      Object.entries(docs).map(([docId, doc]) => {
        const key: DocKey = { col: { type: 'normal', name: colName }, id: docId };
        if (doc.op === 'merge') return db.mergeDoc({ key, docData: doc.data });
        if (doc.op === 'delete') return db.deleteDoc({ key });
        assertNever(doc);
      })
    )
  );
  Promise.all(action.mayFailOps.map((mfo) => mfo({ ...db, snapshot })));
  return { tag: 'right', value: result };
}

export function isTriggerRequired<A extends ActionType, GDE, WR>(
  action: ColDrafts<A, GDE, WR>
): boolean {
  return action.getTransactionCommits.length > 0 || action.mayFailOps.length > 0;
}
