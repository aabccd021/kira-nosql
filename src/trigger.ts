import { Spec } from 'kira-core';
import { Either, Failed, foldValue, isDefined, Value } from 'trimop';

import {
  ActionTrigger,
  ColDraft,
  ColTransactionCommit,
  DeleteDoc,
  DeleteDocCommit,
  ExecOnRelDocs,
  GetDoc,
  GetTransactionCommitFailure,
  IncompatibleDocOpFailure,
  TriggerSnapshot,
  SpecToDraft,
  TransactionCommit,
  Trigger,
  UpdateDoc,
  UpdateDocCommit,
} from './type';

function colDraftsToActionTrigger<S extends TriggerSnapshot>(
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
      specToDraft({ context: { colName, fieldName }, spec })
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

export async function getTransactionCommit<S extends TriggerSnapshot>({
  actionTrigger,
  snapshot,
  getDoc,
}: {
  readonly actionTrigger: ActionTrigger<S>;
  readonly snapshot: S;
  readonly getDoc: GetDoc;
}): Promise<Either<GetTransactionCommitFailure, TransactionCommit>> {
  return Promise.all(
    actionTrigger.getTransactionCommits.map((gtc) => gtc({ getDoc, snapshot }))
  ).then((transactionCommits) =>
    transactionCommits.reduce<Either<GetTransactionCommitFailure, TransactionCommit>>(
      (prevTC, curTC) => {
        return foldValue(prevTC, (prevTC) =>
          foldValue(curTC, (curTC) =>
            Object.entries(curTC).reduce<Either<GetTransactionCommitFailure, TransactionCommit>>(
              (prevTC, [curColName, curColTC]) =>
                foldValue(prevTC, (prevTC) => {
                  const prevColTC = prevTC[curColName];
                  if (prevColTC === undefined) {
                    return Value({ ...prevTC, [curColName]: curColTC });
                  }
                  return foldValue(
                    Object.entries(curColTC).reduce<
                      Either<IncompatibleDocOpFailure, ColTransactionCommit>
                    >((prevColTC, [docId, docCommit]) => {
                      return foldValue(prevColTC, (prevColTC) => {
                        const prevCommit = prevColTC[docId];
                        if (prevCommit === undefined) {
                          return Value({ ...prevColTC, [docId]: docCommit });
                        }
                        if (docCommit._op === 'delete' && prevCommit?._op === 'delete') {
                          return Value({
                            ...prevColTC,
                            [docId]: DeleteDocCommit(),
                          });
                        }
                        if (
                          docCommit._op === 'update' &&
                          prevCommit?._op === 'update' &&
                          docCommit.onDocAbsent === prevCommit.onDocAbsent
                        ) {
                          return Value({
                            ...prevColTC,
                            [docId]: UpdateDocCommit({
                              onDocAbsent: docCommit.onDocAbsent,
                              data: { ...docCommit.data, ...prevCommit.data },
                            }),
                          });
                        }
                        return Failed(
                          IncompatibleDocOpFailure({
                            docCommit1: prevCommit,
                            docCommit2: docCommit,
                          })
                        );
                      });
                    }, Value(prevColTC)),
                    (updatedColTC) => {
                      return Value({
                        ...prevTC,
                        [curColName]: updatedColTC,
                      });
                    }
                  );
                }),
              Value(prevTC)
            )
          )
        );
      },
      Value({})
    )
  );
}

export async function runMayFailOps<S extends TriggerSnapshot>({
  actionTrigger,
  snapshot,
  getDoc,
  updateDoc,
  deleteDoc,
  execOnRelDocs,
}: {
  readonly actionTrigger: ActionTrigger<S>;
  readonly snapshot: S;
  readonly getDoc: GetDoc;
  readonly updateDoc: UpdateDoc;
  readonly deleteDoc: DeleteDoc;
  readonly execOnRelDocs: ExecOnRelDocs;
}): Promise<void> {
  await Promise.all(
    actionTrigger.mayFailOps.map((mayFailOp) =>
      mayFailOp({ getDoc, updateDoc, deleteDoc, execOnRelDocs, snapshot })
    )
  );
}

export function isTriggerRequired<S extends TriggerSnapshot>(actionTrigger: ActionTrigger<S>): boolean {
  return actionTrigger.getTransactionCommits.length > 0 || actionTrigger.mayFailOps.length > 0;
}
