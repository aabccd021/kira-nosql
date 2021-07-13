import { CountField } from 'kira-core';

import { Draft, DraftMakerContext } from '../type';

export function makeCountTrigger<GDE, WR>({
  colName,
  fieldSpec,
  fieldName,
}: DraftMakerContext<CountField>): Draft<GDE, WR> {
  return {
    onCreate: {
      [colName]: {
        getTransactionCommit: async ({ snapshot: doc }) => ({
          tag: 'right',
          value: {
            [colName]: {
              [doc.id]: {
                op: 'merge',
                data: {
                  [fieldName]: { type: 'number', value: 0 },
                },
              },
            },
          },
        }),
      },
      [fieldSpec.countedCol]: {
        getTransactionCommit: async ({ snapshot: document }) => {
          const counterDoc = document.data?.[fieldSpec.groupByRef];
          if (counterDoc?.type !== 'ref') {
            return {
              tag: 'left',
              error: { errorType: 'invalid_data_type' },
            };
          }
          return {
            tag: 'right',
            value: {
              [colName]: {
                [counterDoc.value.id]: {
                  op: 'merge',
                  data: {
                    [fieldName]: { type: 'increment', incrementValue: 1 },
                  },
                },
              },
            },
          };
        },
      },
    },
    onDelete: {
      [fieldSpec.countedCol]: {
        getTransactionCommit: async ({ snapshot: doc }) => {
          const counterDoc = doc.data?.[fieldSpec.groupByRef];
          if (counterDoc?.type !== 'ref') {
            return {
              tag: 'left',
              error: { errorType: 'invalid_data_type' },
            };
          }
          return {
            tag: 'right',
            value: {
              [colName]: {
                [counterDoc.value.id]: {
                  op: 'merge',
                  data: {
                    [fieldName]: { type: 'increment', incrementValue: -1 },
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
