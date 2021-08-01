import { CountFieldSpec, IncrementField, InvalidFieldTypeFailure, NumberField } from 'kira-core';
import { Failed, Value } from 'trimop';

import { Draft, DraftMakerContext, UpdateDocCommit } from '../type';

export function makeCountDraft({
  context: { colName, fieldName },
  spec,
}: {
  readonly context: DraftMakerContext;
  readonly spec: CountFieldSpec;
}): Draft {
  return {
    onCreate: {
      [colName]: {
        getTransactionCommit: async ({ snapshot }) => {
          return Value({
            [colName]: {
              [snapshot.id]: UpdateDocCommit({
                data: {
                  [fieldName]: NumberField(0),
                },
                onDocAbsent: 'doNotUpdate',
              }),
            },
          });
        },
      },
      [spec.countedCol]: {
        getTransactionCommit: async ({ snapshot }) => {
          const counterDoc = snapshot.doc?.[spec.groupByRef];

          if (counterDoc?._type !== 'ref') {
            return Failed(
              InvalidFieldTypeFailure({
                expectedFieldTypes: ['ref'],
                field: counterDoc,
              })
            );
          }

          return Value({
            [colName]: {
              [counterDoc.snapshot.id]: UpdateDocCommit({
                data: {
                  [fieldName]: IncrementField(1),
                },
                onDocAbsent: 'doNotUpdate',
              }),
            },
          });
        },
      },
    },
    onDelete: {
      [spec.countedCol]: {
        getTransactionCommit: async ({ snapshot }) => {
          const counterDoc = snapshot.doc?.[spec.groupByRef];

          if (counterDoc?._type !== 'ref') {
            return Failed(
              InvalidFieldTypeFailure({
                expectedFieldTypes: ['ref'],
                field: counterDoc,
              })
            );
          }

          return Value({
            [colName]: {
              [counterDoc.snapshot.id]: UpdateDocCommit({
                data: {
                  [fieldName]: IncrementField(-1),
                },
                onDocAbsent: 'doNotUpdate',
              }),
            },
          });
        },
      },
    },
  };
}
