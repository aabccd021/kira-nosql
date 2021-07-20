import { Spec } from 'kira-core';

import {
  ActionTrigger,
  ColDraft,
  ColTransactionCommit,
  DB,
  Either,
  GetDoc,
  GetTransactionCommitError,
  IncompatibleDocOpError,
  Snapshot,
  SpecToDraft,
  TransactionCommit,
  Trigger,
} from './type';

function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

function colDraftsToActionTrigger<S extends Snapshot>(
  colDraft: readonly (ColDraft<S> | undefined)[]
): ActionTrigger<S> {
  return {
    getTransactionCommits: colDraft.map((x) => x?.getTransactionCommit).filter(isDefined),
    mayFailOps: colDraft.map((x) => x?.mayFailOp).filter(isDefined),
  };
}

export function getTrigger({
  spec,
  specToDraft,
}: {
  readonly spec: Spec;
  readonly specToDraft: SpecToDraft;
}): Trigger {
  const drafts = Object.entries(spec).flatMap(([colName, docFieldSpecs]) =>
    Object.entries(docFieldSpecs).map(([fieldName, spec]) =>
      specToDraft({ colName, fieldName, spec })
    )
  );
  return Object.fromEntries(
    Object.entries(spec).map(([colName]) => {
      return [
        colName,
        {
          onCreate: colDraftsToActionTrigger(drafts.map((draft) => draft.onCreate?.[colName])),
          onUpdate: colDraftsToActionTrigger(drafts.map((draft) => draft.onUpdate?.[colName])),
          onDelete: colDraftsToActionTrigger(drafts.map((draft) => draft.onDelete?.[colName])),
        },
      ];
    })
  );
}

export async function getTransactionCommit<S extends Snapshot>({
  actionTrigger,
  snapshot,
  db,
}: {
  readonly actionTrigger: ActionTrigger<S>;
  readonly snapshot: S;
  readonly db: {
    readonly getDoc: GetDoc;
  };
}): Promise<Either<TransactionCommit, GetTransactionCommitError>> {
  return Promise.all(actionTrigger.getTransactionCommits.map((gtc) => gtc({ db, snapshot }))).then(
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

export async function runMayFailOps<S extends Snapshot>({
  actionTrigger,
  snapshot,
  db,
}: {
  readonly actionTrigger: ActionTrigger<S>;
  readonly snapshot: S;
  readonly db: DB;
}): Promise<void> {
  await Promise.all(actionTrigger.mayFailOps.map((mayFailOp) => mayFailOp({ db, snapshot })));
}

export function isTriggerRequired<S extends Snapshot>(actionTrigger: ActionTrigger<S>): boolean {
  return actionTrigger.getTransactionCommits.length > 0 || actionTrigger.mayFailOps.length > 0;
}
