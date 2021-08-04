import { CountFieldSpec, IncrementField, NumberField } from 'kira-core';
import { left, none, right, some } from 'trimop';

import { Draft, DraftBuilderContext, InvalidFieldTypeError, UpdateDocCommit } from '../type';

export function makeCountDraft({
  context: { colName, fieldName },
  spec,
}: {
  readonly context: DraftBuilderContext;
  readonly spec: CountFieldSpec;
}): Draft {
  return {
    onCreate: some({
      [colName]: {
        getTransactionCommit: some(async ({ snapshot }) =>
          right({
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
        propagationOp: none(),
      },
      [spec.countedCol]: {
        getTransactionCommit: some(async ({ snapshot }) => {
          const counterDoc = snapshot.doc[spec.groupByRef];

          if (counterDoc?._type !== 'Ref') {
            return left(
              InvalidFieldTypeError({
                expectedFieldTypes: ['Ref'],
                field: counterDoc,
              })
            );
          }

          return right({
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
        propagationOp: none(),
      },
    }),
    onDelete: some({
      [spec.countedCol]: {
        getTransactionCommit: some(async ({ snapshot }) => {
          const counterDoc = snapshot.doc[spec.groupByRef];

          if (counterDoc?._type !== 'Ref') {
            return left(
              InvalidFieldTypeError({
                expectedFieldTypes: ['Ref'],
                field: counterDoc,
              })
            );
          }

          return right({
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
        propagationOp: none(),
      },
    }),
    onUpdate: none(),
  };
}
