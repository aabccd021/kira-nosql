import { CountFieldSpec } from 'kira-core';

import {
  Draft,
  DraftMakerContext,
  IncrementField,
  InvalidFieldTypeError,
  Left,
  NumberField,
  Right,
  UpdateDocCommit,
} from '../type';

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
          return Right({
            [colName]: {
              [snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                data: {
                  [fieldName]: NumberField(0),
                },
              }),
            },
          });
        },
      },
      [spec.countedCol]: {
        getTransactionCommit: async ({ snapshot }) => {
          const counterDoc = snapshot.data?.[spec.groupByRef];

          if (counterDoc?._type !== 'ref') {
            return Left(InvalidFieldTypeError());
          }

          return Right({
            [colName]: {
              [counterDoc.value.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                data: {
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
          const counterDoc = snapshot.data?.[spec.groupByRef];

          if (counterDoc?._type !== 'ref') {
            return Left(InvalidFieldTypeError());
          }

          return Right({
            [colName]: {
              [counterDoc.value.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                data: {
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
