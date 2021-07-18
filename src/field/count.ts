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
          if (snapshot.type === 'change') {
            return { tag: 'left', error: { type: 'InvalidSnapshotError' } };
          }
          return {
            tag: 'right',
            value: {
              [colName]: {
                [snapshot.doc.id]: {
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
          if (snapshot.type === 'change') {
            return { tag: 'left', error: { type: 'InvalidSnapshotError' } };
          }

          const counterDoc = snapshot.doc.data?.[spec.groupByRef];
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
          if (snapshot.type === 'change') {
            return { tag: 'left', error: { type: 'InvalidSnapshotError' } };
          }

          const counterDoc = snapshot.doc.data?.[spec.groupByRef];
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
