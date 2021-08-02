import { Spec } from 'kira-core';
import { Either, foldValue, isDefined, Value } from 'trimop';

import {
  ActionTrigger,
  BuildDraft,
  ColDraft,
  ColTransactionCommit,
  DeleteDoc,
  ExecOnRelDocs,
  GetDoc,
  GetTransactionCommitFailure,
  IncompatibleDocOpFailure,
  TransactionCommit,
  Trigger,
  TriggerSnapshot,
  UpdateDoc,
  UpdateDocCommit,
} from './type';

function colDraftsToActionTrigger<S extends TriggerSnapshot>(
  colDraft: readonly (ColDraft<S> | undefined)[]
): ActionTrigger<S> | undefined {
  const definedColDraft = colDraft.filter(isDefined);
  if (definedColDraft.length === 0) {
    return undefined;
  }
  return {
    getTransactionCommits: definedColDraft.map((x) => x.getTransactionCommit).filter(isDefined),
    propagationOps: definedColDraft.map((x) => x.propagationOp).filter(isDefined),
  };
}

export function getTrigger({
  spec,
  buildDraft,
}: {
  readonly buildDraft: BuildDraft;
  readonly spec: Spec;
}): Trigger {
  const drafts = Object.entries(spec).flatMap(([colName, docFieldSpecs]) =>
    Object.entries(docFieldSpecs).map(([fieldName, spec]) =>
      buildDraft({ context: { colName, fieldName }, spec })
    )
  );
  return Object.fromEntries(
    Object.entries(spec).map(([colName]) => {
      return [
        colName,
        {
          onCreate: colDraftsToActionTrigger(drafts.map((draft) => draft.onCreate?.[colName])),
          onDelete: colDraftsToActionTrigger(drafts.map((draft) => draft.onDelete?.[colName])),
          onUpdate: colDraftsToActionTrigger(drafts.map((draft) => draft.onUpdate?.[colName])),
        },
      ];
    })
  );
}

export function getTransactionCommit<S extends TriggerSnapshot>({
  actionTrigger,
  snapshot,
  getDoc,
}: {
  readonly actionTrigger: ActionTrigger<S>;
  readonly getDoc: GetDoc;
  readonly snapshot: S;
}): Promise<Either<GetTransactionCommitFailure, TransactionCommit>> {
  return Promise.all(
    actionTrigger.getTransactionCommits.map((gtc) => gtc({ getDoc, snapshot }))
  ).then((transactionCommits) =>
    transactionCommits.reduce<Either<GetTransactionCommitFailure, TransactionCommit>>(
      (prevTC, curTC) =>
        foldValue(prevTC, (prevTC) =>
          foldValue(curTC, (curTC) =>
            Object.entries(curTC).reduce<Either<GetTransactionCommitFailure, TransactionCommit>>(
              (prevTC, [curColName, curColTC]) =>
                foldValue(prevTC, (prevTC) => {
                  const prevColTC = prevTC[curColName];
                  return prevColTC === undefined
                    ? Value({
                        ...prevTC,
                        [curColName]: curColTC,
                      })
                    : foldValue(
                        Object.entries(curColTC).reduce<
                          Either<IncompatibleDocOpFailure, ColTransactionCommit>
                        >(
                          (prevColTC, [docId, docCommit]) =>
                            foldValue(prevColTC, (prevColTC) => {
                              const prevCommit = prevColTC[docId];
                              if (prevCommit === undefined) {
                                return Value({ ...prevColTC, [docId]: docCommit });
                              }
                              /**
                               * can handle doc delete and multiple doc update options, commented
                               * because no field uses it
                               */
                              // if (docCommit._op === 'Delete' && prevCommit?._op === 'Delete') {
                              //   return Value({
                              //     ...prevColTC,
                              //     [docId]: DeleteDocCommit(),
                              //   });
                              // }
                              // if (
                              //   docCommit._op === 'Update' &&
                              //   prevCommit?._op === 'Update' &&
                              //   docCommit.onDocAbsent === prevCommit.onDocAbsent
                              // ) {
                              return Value({
                                ...prevColTC,
                                [docId]: UpdateDocCommit({
                                  onDocAbsent: docCommit.onDocAbsent,
                                  writeDoc: { ...docCommit.writeDoc, ...prevCommit.writeDoc },
                                }),
                              });
                              // }
                              // return Failed(
                              //   IncompatibleDocOpFailure({
                              //     docCommit1: prevCommit,
                              //     docCommit2: docCommit,
                              //   })
                              // );
                            }),
                          Value(prevColTC)
                        ),
                        (updatedColTC) =>
                          Value({
                            ...prevTC,
                            [curColName]: updatedColTC,
                          })
                      );
                }),
              Value(prevTC)
            )
          )
        ),
      Value({})
    )
  );
}

export function execPropagationOps<S extends TriggerSnapshot>({
  actionTrigger,
  snapshot,
  updateDoc,
  deleteDoc,
  execOnRelDocs,
}: {
  readonly actionTrigger: ActionTrigger<S>;
  readonly deleteDoc: DeleteDoc;
  readonly execOnRelDocs: ExecOnRelDocs;
  readonly snapshot: S;
  readonly updateDoc: UpdateDoc;
}): Promise<unknown> {
  return Promise.all(
    actionTrigger.propagationOps.map((propagationOp) =>
      propagationOp({ deleteDoc, execOnRelDocs, snapshot, updateDoc })
    )
  );
}

export function isTriggerRequired<S extends TriggerSnapshot>(
  actionTrigger: ActionTrigger<S>
): boolean {
  return actionTrigger.getTransactionCommits.length > 0 || actionTrigger.propagationOps.length > 0;
}
