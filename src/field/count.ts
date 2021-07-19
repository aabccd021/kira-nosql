import { CountFieldSpec } from 'kira-core';

import { Draft, DraftMakerContext } from '../type';

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
          return {
            tag: 'right',
            value: {
              [colName]: {
                [snapshot.id]: {
                  op: 'update',
                  onDocAbsent: 'doNotUpdate',
                  data: {
                    [fieldName]: { type: 'number', value: 0 },
                  },
                },
              },
            },
          };
        },
      },
      [spec.countedCol]: {
        getTransactionCommit: async ({ snapshot }) => {
          const counterDoc = snapshot.data?.[spec.groupByRef];
          if (counterDoc?.type !== 'ref') {
            return {
              tag: 'left',
              error: { type: 'InvalidFieldTypeError' },
            };
          }
          return {
            tag: 'right',
            value: {
              [colName]: {
                [counterDoc.value.id]: {
                  op: 'update',
                  onDocAbsent: 'doNotUpdate',
                  data: {
                    [fieldName]: { type: 'increment', value: 1 },
                  },
                },
              },
            },
          };
        },
      },
    },
    onDelete: {
      [spec.countedCol]: {
        getTransactionCommit: async ({ snapshot }) => {
          const counterDoc = snapshot.data?.[spec.groupByRef];
          if (counterDoc?.type !== 'ref') {
            return {
              tag: 'left',
              error: { type: 'InvalidFieldTypeError' },
            };
          }
          return {
            tag: 'right',
            value: {
              [colName]: {
                [counterDoc.value.id]: {
                  op: 'update',
                  onDocAbsent: 'doNotUpdate',
                  data: {
                    [fieldName]: { type: 'increment', value: -1 },
                  },
                },
              },
            },
          };
        },
      },
    },
  };
}
