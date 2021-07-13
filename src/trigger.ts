import assertNever from 'assert-never';
import { Dictionary, Field } from 'kira-core';

import {
  ACTION_TYPE,
  ActionType,
  ColDrafts,
  DataTypeError,
  DB,
  DocCommit,
  DocKey,
  Draft,
  Either,
  MakeDraft,
  SnapshotOfActionType,
} from './type';

function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

export function getActionDrafts<GDE, WR>({
  drafts,
  colName,
}: {
  readonly drafts: readonly Draft<GDE, WR>[];
  readonly colName: string;
}): { readonly [A in ActionType]?: ColDrafts<A, GDE, WR> } {
  return Object.fromEntries(
    ACTION_TYPE.map((actionType) => {
      const colDrafts = drafts.map((draft) => draft[actionType]?.[colName]);
      return [
        actionType,
        {
          getTransactionCommits: colDrafts.map((x) => x?.getTransactionCommit).filter(isDefined),
          mayFailOps: colDrafts.map((x) => x?.mayFailOp).filter(isDefined),
        },
      ];
    })
  );
}

export function getDraft<F extends Field, GDE, WR>({
  cols,
  makeDraft,
}: {
  readonly cols: Dictionary<Dictionary<F>>;
  readonly makeDraft: MakeDraft<F, GDE, WR>;
}): readonly Draft<GDE, WR>[] {
  return Object.entries(cols).flatMap(([colName, col]) =>
    Object.entries(col).map(([fieldName, fieldSpec]) =>
      makeDraft({ colName, fieldName, fieldSpec })
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
  const transactionCommit = await Promise.all(
    action.getTransactionCommits.map((gtc) => gtc({ ...db, snapshot }))
  ).then((transactionCommits) =>
    transactionCommits.reduce(
      (prevTC, currentTC) => {
        if (prevTC.tag === 'left') return prevTC;
        if (currentTC.tag === 'left') return currentTC;
        return {
          tag: 'right',
          value: {
            // merge Transaction commit
            ...currentTC.value,
            ...Object.fromEntries(
              Object.entries(prevTC.value).map(([colName, col]) => {
                const col2 = currentTC.value[colName] ?? {};
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
  if (transactionCommit.tag === 'left') {
    return transactionCommit;
  }
  const result = await Promise.all(
    Object.entries(transactionCommit.value).flatMap(([colName, docs]) =>
      Object.entries(docs).map(([docId, doc]) => {
        const key: DocKey = { col: { type: 'normal', name: colName }, id: docId };
        if (doc.op === 'merge') return db.mergeDoc({ key, docData: doc.data });
        if (doc.op === 'delete') return db.deleteDoc({ key });
        assertNever(doc);
      })
    )
  );
  Promise.all(action.mayFailOps.map((mayFailOp) => mayFailOp({ ...db, snapshot })));
  return { tag: 'right', value: result };
}

export function isTriggerRequired<A extends ActionType, GDE, WR>(
  colDrafts: ColDrafts<A, GDE, WR>
): boolean {
  return colDrafts.getTransactionCommits.length > 0 || colDrafts.mayFailOps.length > 0;
}
