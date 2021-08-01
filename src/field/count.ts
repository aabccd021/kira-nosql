import { CountFieldSpec, IncrementField, InvalidFieldTypeFailure, NumberField } from 'kira-core';
import { Failed, Value } from 'trimop';

import { Draft, DraftBuilderContext, UpdateDocCommit } from '../type';

export function makeCountDraft({
  context: { colName, fieldName },
  spec,
}: {
  readonly context: DraftBuilderContext;
  readonly spec: CountFieldSpec;
}): Draft {
  return {
    onCreate: {
      [colName]: {
        getTransactionCommit: async ({ snapshot }) =>
          Value({
            [colName]: {
              [snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  [fieldName]: NumberField(0),
                },
              }),
            },
          }),
      },
      [spec.countedCol]: {
        getTransactionCommit: async ({ snapshot }) => {
          const counterDoc = snapshot.doc[spec.groupByRef];

          if (counterDoc?._type !== 'Ref') {
            return Failed(
              InvalidFieldTypeFailure({
                expectedFieldTypes: ['Ref'],
                field: counterDoc,
              })
            );
          }

          return Value({
            [colName]: {
              [counterDoc.snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  [fieldName]: IncrementField(1),
                },
              }),
            },
          });
        },
      },
    },
    onDelete: {
      [spec.countedCol]: {
        getTransactionCommit: async ({ snapshot }) => {
          const counterDoc = snapshot.doc[spec.groupByRef];

          if (counterDoc?._type !== 'Ref') {
            return Failed(
              InvalidFieldTypeFailure({
                expectedFieldTypes: ['Ref'],
                field: counterDoc,
              })
            );
          }

          return Value({
            [colName]: {
              [counterDoc.snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  [fieldName]: IncrementField(-1),
                },
              }),
            },
          });
        },
      },
    },
  };
}
