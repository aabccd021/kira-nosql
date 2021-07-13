import assertNever from 'assert-never';
import { Dictionary, Field } from 'kira-core';

import {
  ACTION_TYPE,
  ActionType,
  ColDrafts,
  DataTypeError,
  DB,
  DbDocKey,
  DocCommit,
  DocKey,
  Draft,
  Either,
  MakeDraft,
  Op,
  SnapshotOfActionType,
} from './type';

function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

function toDbDocKey({ col, id }: DocKey): DbDocKey {
  if (col.type === 'normal') {
    return { col: col.name, id: id };
  }
  if (col.type === 'rel') {
    return {
      col: '_relation',
      id: `${col.referCol}_${col.referField}_${col.refedCol}_${id}`,
    };
  }
  assertNever(col);
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
  draft,
  snapshot,
  db,
}: {
  readonly draft: ColDrafts<A, GDE, WR>;
  readonly snapshot: SnapshotOfActionType<A>;
  readonly db: DB<GDE, WR>;
}): Promise<Either<readonly WR[], DataTypeError | GDE>> {
  const op: Op<GDE, WR> = {
    getDoc: ({ key }) => db.getDoc({ key: toDbDocKey(key) }),
    mergeDoc: ({ key, docData }) => db.mergeDoc({ key: toDbDocKey(key), docData }),
    deleteDoc: ({ key }) => db.deleteDoc({ key: toDbDocKey(key) }),
  };
  const transactionCommit = await Promise.all(
    draft.getTransactionCommits.map((gtc) => gtc({ ...op, snapshot }))
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
        const key: DbDocKey = { col: colName, id: docId };
        if (doc.op === 'merge') return db.mergeDoc({ key, docData: doc.data });
        if (doc.op === 'delete') return db.deleteDoc({ key });
        assertNever(doc);
      })
    )
  );
  Promise.all(draft.mayFailOps.map((mayFailOp) => mayFailOp({ ...op, snapshot })));
  return { tag: 'right', value: result };
}

export function isTriggerRequired<A extends ActionType, GDE, WR>(
  colDrafts: ColDrafts<A, GDE, WR>
): boolean {
  return colDrafts.getTransactionCommits.length > 0 || colDrafts.mayFailOps.length > 0;
}
