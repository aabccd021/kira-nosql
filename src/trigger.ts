import { Spec } from 'kira-core';
import {
  Either,
  eitherArrayReduce,
  eitherMapRight,
  isSome,
  none,
  Option,
  optionFold,
  optionFromNullable,
  optionMapSome,
  right,
  some,
} from 'trimop';

import {
  ActionTrigger,
  BuildDraft,
  ColDraft,
  ColTransactionCommit,
  DeleteDoc,
  ExecOnRelDocs,
  GetDoc,
  GetTransactionCommitError,
  TransactionCommit,
  Trigger,
  TriggerSnapshot,
  UpdateDoc,
  UpdateDocCommit,
} from './type';

function colDraftsToActionTrigger<S extends TriggerSnapshot>(
  colDraft: readonly Option<ColDraft<S>>[]
): Option<ActionTrigger<S>> {
  const definedColDraft = colDraft.filter(isSome);
  if (definedColDraft.length === 0) {
    return none();
  }
  // definedColDraft.map((x) => x.value)
  return some({
    getTransactionCommits: definedColDraft
      .map((el) => el.value.getTransactionCommit)
      .filter(isSome)
      .map((el) => el.value),
    propagationOps: definedColDraft
      .map((el) => el.value.propagationOp)
      .filter(isSome)
      .map((el) => el.value),
  });
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
          onCreate: colDraftsToActionTrigger(
            drafts.map((draft) =>
              optionMapSome(draft.onCreate, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          ),
          onDelete: colDraftsToActionTrigger(
            drafts.map((draft) =>
              optionMapSome(draft.onDelete, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          ),
          onUpdate: colDraftsToActionTrigger(
            drafts.map((draft) =>
              optionMapSome(draft.onUpdate, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          ),
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
}): Promise<Either<GetTransactionCommitError, TransactionCommit>> {
  return Promise.all(
    actionTrigger.getTransactionCommits.map((gtc) => gtc({ getDoc, snapshot }))
  ).then((transactionCommits) =>
    eitherArrayReduce(transactionCommits, right({}), (acc, curTC) =>
      eitherMapRight<TransactionCommit, GetTransactionCommitError, TransactionCommit>(
        curTC,
        (curTC) =>
          eitherArrayReduce<
            TransactionCommit,
            GetTransactionCommitError,
            readonly [string, ColTransactionCommit]
          >(Object.entries(curTC), right(acc), (prevTC, [curColName, curColTC]) => {
            const prevColTC = prevTC[curColName];
            return prevColTC === undefined
              ? right<TransactionCommit>({
                  ...prevTC,
                  [curColName]: curColTC,
                })
              : eitherMapRight(
                  eitherArrayReduce(
                    Object.entries(curColTC),
                    right(prevColTC),
                    (prevColTC, [docId, docCommit]) => {
                      return optionFold(
                        optionFromNullable(prevColTC[docId]),
                        () => right({ ...prevColTC, [docId]: docCommit }),
                        (prevCommit) => {
                          /**
                           * can handle doc delete and multiple doc update options, commented
                           * because no field uses it
                           */
                          // if (docCommit._op === 'Delete' && prevCommit?._op === 'Delete') {
                          //   return right({
                          //     ...prevColTC,
                          //     [docId]: DeleteDocCommit(),
                          //   });
                          // }
                          // if (
                          //   docCommit._op === 'Update' &&
                          //   prevCommit?._op === 'Update' &&
                          //   docCommit.onDocAbsent === prevCommit.onDocAbsent
                          // ) {
                          return right({
                            ...prevColTC,
                            [docId]: UpdateDocCommit({
                              onDocAbsent: docCommit.onDocAbsent,
                              writeDoc: { ...docCommit.writeDoc, ...prevCommit.writeDoc },
                            }),
                          });
                          // }
                          // return left(
                          //   IncompatibleDocOpError({
                          //     docCommit1: prevCommit,
                          //     docCommit2: docCommit,
                          //   })
                          // );
                        }
                      );
                    }
                  ),
                  (updatedColTC) =>
                    right({
                      ...prevTC,
                      [curColName]: updatedColTC,
                    })
                );
          })
      )
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
