import { Dictionary, Field } from 'kira-core';

import {
  ACTION_TYPE,
  ActionType,
  ColDrafts,
  ColTransactionCommit,
  DB,
  Draft,
  Either,
  GetDoc,
  KiraError,
  MakeDraft,
  SnapshotOfActionType,
  TransactionCommit,
  TransactionCommitError,
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

export async function getTransactionCommit<A extends ActionType, GDE, WR>({
  draft,
  snapshot,
  getDoc,
}: {
  readonly draft: ColDrafts<A, GDE, WR>;
  readonly snapshot: SnapshotOfActionType<A>;
  readonly getDoc: GetDoc<GDE>;
}): Promise<Either<TransactionCommit, KiraError | GDE>> {
  return Promise.all(draft.getTransactionCommits.map((gtc) => gtc({ getDoc, snapshot }))).then(
    (transactionCommits) =>
      transactionCommits.reduce<Either<TransactionCommit, KiraError | GDE>>(
        (prevTC, curTC) => {
          if (prevTC.tag === 'left') return prevTC;
          if (curTC.tag === 'left') return curTC;
          return Object.entries(curTC.value).reduce<
            Either<TransactionCommit, TransactionCommitError>
          >(
            (prevTC, [curColName, curColTC]) => {
              if (prevTC.tag === 'left') {
                return prevTC;
              }
              const prevColTc = prevTC.value[curColName];
              if (prevColTc === undefined) {
                return {
                  tag: 'right',
                  value: { ...prevTC.value, [curColName]: curColTC },
                };
              }
              const mergedColTC = Object.entries(curColTC).reduce<
                Either<ColTransactionCommit, TransactionCommitError>
              >(
                (prevColTC, [docId, docOp]) => {
                  if (prevColTC.tag === 'left') {
                    return prevColTC;
                  }
                  const prevOp = prevColTC.value[docId];
                  if (prevOp === undefined) {
                    return {
                      tag: 'right',
                      value: { ...prevColTC.value, [docId]: docOp },
                    };
                  }
                  if (docOp.op === 'delete' || prevOp?.op === 'delete') {
                    return {
                      tag: 'right',
                      value: {
                        ...prevColTC.value,
                        [docId]: { op: 'delete' },
                      },
                    };
                  }
                  if (docOp.op === 'set' || prevOp?.op === 'set') {
                    return {
                      tag: 'right',
                      value: {
                        ...prevColTC.value,
                        [docId]: {
                          op: 'set',
                          data: { ...docOp.data, ...prevOp.data },
                        },
                      },
                    };
                  }
                  if (docOp.op === 'update' || prevOp?.op === 'update') {
                    return {
                      tag: 'right',
                      value: {
                        ...prevColTC.value,
                        [docId]: {
                          op: 'update',
                          data: { ...docOp.data, ...prevOp.data },
                        },
                      },
                    };
                  }
                  return {
                    tag: 'left',
                    error: { errorType: 'transaction_commit' },
                  };
                },
                { tag: 'right', value: prevColTc }
              );
              if (mergedColTC.tag === 'left') {
                return mergedColTC;
              }
              return {
                tag: 'right',
                value: {
                  ...prevTC.value,
                  [curColName]: mergedColTC.value,
                },
              };
            },
            { tag: 'right', value: prevTC.value }
          );
        },
        { tag: 'right', value: {} }
      )
  );
}

export async function runMayFailOps<A extends ActionType, GDE, WR>({
  draft,
  snapshot,
  db,
}: {
  readonly draft: ColDrafts<A, GDE, WR>;
  readonly snapshot: SnapshotOfActionType<A>;
  readonly db: DB<GDE, WR>;
}): Promise<void> {
  await Promise.all(draft.mayFailOps.map((mayFailOp) => mayFailOp({ ...db, snapshot })));
}

export function isTriggerRequired<A extends ActionType, GDE, WR>(
  colDrafts: ColDrafts<A, GDE, WR>
): boolean {
  return colDrafts.getTransactionCommits.length > 0 || colDrafts.mayFailOps.length > 0;
}
