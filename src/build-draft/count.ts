import { CountFieldSpec, IncrementField, NumberField } from 'kira-core';
import { Left, None, Right, Some } from 'trimop';

import { Draft, DraftBuilderContext, InvalidFieldTypeError, UpdateDocCommit } from '../type';

export function buildCountDraft({
  context: { colName, fieldName },
  spec,
}: {
  readonly context: DraftBuilderContext;
  readonly spec: CountFieldSpec;
}): Some<Draft> {
  return Some({
    onCreate: Some({
      [colName]: {
        getTransactionCommit: Some(async ({ snapshot }) =>
          Right({
            [colName]: {
              [snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  [fieldName]: NumberField(0),
                },
              }),
            },
          })
        ),
        propagationOp: None(),
      },
      [spec.countedCol]: {
        getTransactionCommit: Some(async ({ snapshot }) => {
          const counterDoc = snapshot.doc[spec.groupByRef];

          if (counterDoc?._type !== 'Ref') {
            return Left(
              InvalidFieldTypeError({
                doc: snapshot.doc,
                fieldName,
              })
            );
          }

          return Right({
            [colName]: {
              [counterDoc.snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  [fieldName]: IncrementField(1),
                },
              }),
            },
          });
        }),
        propagationOp: None(),
      },
    }),
    onDelete: Some({
      [spec.countedCol]: {
        getTransactionCommit: Some(async ({ snapshot }) => {
          const counterDoc = snapshot.doc[spec.groupByRef];

          if (counterDoc?._type !== 'Ref') {
            return Left(
              InvalidFieldTypeError({
                doc: snapshot.doc,
                fieldName,
              })
            );
          }

          return Right({
            [colName]: {
              [counterDoc.snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  [fieldName]: IncrementField(-1),
                },
              }),
            },
          });
        }),
        propagationOp: None(),
      },
    }),
    onUpdate: None(),
  });
}
