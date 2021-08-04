import {
  Either,
  eitherArrayReduce,
  eitherMapRight,
  optionFold,
  optionFromNullable,
  Right,
} from 'trimop';

import {
  ActionTrigger,
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
    eitherArrayReduce<
      TransactionCommit,
      GetTransactionCommitError,
      Either<GetTransactionCommitError, TransactionCommit>
    >(transactionCommits, Right({}), (accTC, tc) =>
      eitherMapRight(tc, (tc) =>
        // tc vs tc
        eitherArrayReduce(Object.entries(tc), Right(accTC), (accTC, [colName, colTC]) =>
          Right({
            ...accTC,
            [colName]: optionFold(
              optionFromNullable(accTC[colName]),
              () => colTC,
              (accColTC) =>
                // colTc vs colTc
                Object.entries(colTC).reduce(
                  (accColTC, [docId, docCommit]) => ({
                    ...accColTC,
                    [docId]: optionFold(
                      optionFromNullable(accColTC[docId]),
                      () => docCommit,
                      (accDocCommit) =>
                        UpdateDocCommit({
                          onDocAbsent: docCommit.onDocAbsent,
                          writeDoc: { ...docCommit.writeDoc, ...accDocCommit.writeDoc },
                        })
                    ),
                  }),
                  accColTC
                )
            ),
          })
        )
      )
    )
  );
}
