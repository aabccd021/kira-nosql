import { Dictionary, FieldSpec } from 'kira-core';

import {
  ACTION_TYPE,
  ActionType,
  ColDrafts,
  ColTransactionCommit,
  DB,
  Draft,
  Either,
  GetDoc,
  GetTransactionCommitError,
  IncompatibleDocOpError,
  MakeDraft,
  TransactionCommit,
  TriggerSnapshot,
} from './type';

function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

export function getActionDrafts({
  drafts,
  colName,
}: {
  readonly drafts: readonly Draft[];
  readonly colName: string;
}): { readonly [A in ActionType]?: ColDrafts } {
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

export function getDraft({
  spec,
  makeDraft,
}: {
  readonly spec: Dictionary<Dictionary<FieldSpec>>;
  readonly makeDraft: MakeDraft;
}): readonly Draft[] {
  return Object.entries(spec).flatMap(([colName, docFieldSpecs]) =>
    Object.entries(docFieldSpecs).map(([fieldName, spec]) =>
      makeDraft({ colName, fieldName, spec })
    )
  );
}

export async function getTransactionCommit({
  draft,
  snapshot,
  getDoc,
}: {
  readonly draft: ColDrafts;
  readonly snapshot: TriggerSnapshot;
  readonly getDoc: GetDoc;
}): Promise<Either<TransactionCommit, GetTransactionCommitError>> {
  return Promise.all(draft.getTransactionCommits.map((gtc) => gtc({ getDoc, snapshot }))).then(
    (transactionCommits) =>
      transactionCommits.reduce<Either<TransactionCommit, GetTransactionCommitError>>(
        (prevTC, curTC) => {
          if (prevTC.tag === 'left') return prevTC;
          if (curTC.tag === 'left') return curTC;
          return Object.entries(curTC.value).reduce<
            Either<TransactionCommit, IncompatibleDocOpError>
          >(
            (prevTC, [curColName, curColTC]) => {
              if (prevTC.tag === 'left') return prevTC;

              const prevColTc = prevTC.value[curColName];
              if (prevColTc === undefined) {
                return {
                  tag: 'right',
                  value: { ...prevTC.value, [curColName]: curColTC },
                };
              }
              const updatedColTC = Object.entries(curColTC).reduce<
                Either<ColTransactionCommit, IncompatibleDocOpError>
              >(
                (prevColTC, [docId, docOp]) => {
                  if (prevColTC.tag === 'left') return prevColTC;

                  const prevOp = prevColTC.value[docId];
                  if (prevOp === undefined) {
                    return {
                      tag: 'right',
                      value: { ...prevColTC.value, [docId]: docOp },
                    };
                  }
                  if (docOp.op === 'delete' && prevOp?.op === 'delete') {
                    return {
                      tag: 'right',
                      value: {
                        ...prevColTC.value,
                        [docId]: { op: 'delete' },
                      },
                    };
                  }
                  if (
                    docOp.op === 'update' &&
                    prevOp?.op === 'update' &&
                    docOp.onDocAbsent === prevOp.onDocAbsent
                  ) {
                    return {
                      tag: 'right',
                      value: {
                        ...prevColTC.value,
                        [docId]: {
                          op: 'update',
                          onDocAbsent: docOp.onDocAbsent,
                          data: { ...docOp.data, ...prevOp.data },
                        },
                      },
                    };
                  }
                  return {
                    tag: 'left',
                    error: { type: 'IncompatibleDocOpError' },
                  };
                },
                { tag: 'right', value: prevColTc }
              );

              if (updatedColTC.tag === 'left') return updatedColTC;

              return {
                tag: 'right',
                value: {
                  ...prevTC.value,
                  [curColName]: updatedColTC.value,
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

export async function runMayFailOps({
  draft,
  snapshot,
  db,
}: {
  readonly draft: ColDrafts;
  readonly snapshot: TriggerSnapshot;
  readonly db: DB;
}): Promise<void> {
  await Promise.all(draft.mayFailOps.map((mayFailOp) => mayFailOp({ ...db, snapshot })));
}

export function isTriggerRequired(colDrafts: ColDrafts): boolean {
  return colDrafts.getTransactionCommits.length > 0 || colDrafts.mayFailOps.length > 0;
}
