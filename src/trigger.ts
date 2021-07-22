import { Spec } from 'kira-core';

import {
  ActionTrigger,
  ColDraft,
  ColTransactionCommit,
  DB,
  DeleteDocCommit,
  Either,
  GetDoc,
  GetTransactionCommitError,
  IncompatibleDocOpError,
  Left,
  Right,
  Snapshot,
  SpecToDraft,
  TransactionCommit,
  Trigger,
  UpdateDocCommit,
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
}): Promise<Either<GetTransactionCommitError, TransactionCommit>> {
  return Promise.all(actionTrigger.getTransactionCommits.map((gtc) => gtc({ db, snapshot }))).then(
    (transactionCommits) =>
      transactionCommits.reduce<Either<GetTransactionCommitError, TransactionCommit>>(
        (prevTC, curTC) => {
          if (prevTC._tag === 'left') return prevTC;
          if (curTC._tag === 'left') return curTC;
          return Object.entries(curTC.value).reduce<
            Either<IncompatibleDocOpError, TransactionCommit>
          >((prevTC, [curColName, curColTC]) => {
            if (prevTC._tag === 'left') return prevTC;

            const prevColTc = prevTC.value[curColName];
            if (prevColTc === undefined) {
              return Right({ ...prevTC.value, [curColName]: curColTC });
            }
            const updatedColTC = Object.entries(curColTC).reduce<
              Either<IncompatibleDocOpError, ColTransactionCommit>
            >((prevColTC, [docId, docOp]) => {
              if (prevColTC._tag === 'left') return prevColTC;

              const prevOp = prevColTC.value[docId];
              if (prevOp === undefined) {
                return Right({ ...prevColTC.value, [docId]: docOp });
              }
              if (docOp._type === 'delete' && prevOp?._type === 'delete') {
                return Right({
                  ...prevColTC.value,
                  [docId]: DeleteDocCommit(),
                });
              }
              if (
                docOp._type === 'update' &&
                prevOp?._type === 'update' &&
                docOp.onDocAbsent === prevOp.onDocAbsent
              ) {
                return Right({
                  ...prevColTC.value,
                  [docId]: UpdateDocCommit({
                    onDocAbsent: docOp.onDocAbsent,
                    data: { ...docOp.data, ...prevOp.data },
                  }),
                });
              }
              return Left(IncompatibleDocOpError());
            }, Right(prevColTc));

            if (updatedColTC._tag === 'left') return updatedColTC;

            return Right({
              ...prevTC.value,
              [curColName]: updatedColTC.value,
            });
          }, Right(prevTC.value));
        },
        Right({})
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
