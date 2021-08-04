import {
  Either,
  eitherArrayReduce,
  eitherMapRight,
  optionFold,
  optionFromNullable,
  right,
} from 'trimop';

import {
  ActionTrigger,
  ColTransactionCommit,
  GetDoc,
  GetTransactionCommitError,
  TransactionCommit,
  TriggerSnapshot,
  UpdateDocCommit,
} from './type';

/**
 * Magic HAHA!
 * @param param0
 * @returns
 */
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
          >(Object.entries(curTC), right(acc), (prevTC, [curColName, curColTC]) =>
            optionFold<Either<GetTransactionCommitError, TransactionCommit>, ColTransactionCommit>(
              optionFromNullable(prevTC[curColName]),
              () =>
                right<TransactionCommit>({
                  ...prevTC,
                  [curColName]: curColTC,
                }),
              (prevColTC) =>
                eitherMapRight(
                  eitherArrayReduce(
                    Object.entries(curColTC),
                    right(prevColTC),
                    (prevColTC, [docId, docCommit]) =>
                      optionFold(
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
                      )
                  ),
                  (updatedColTC) =>
                    right({
                      ...prevTC,
                      [curColName]: updatedColTC,
                    })
                )
            )
          )
      )
    )
  );
}
