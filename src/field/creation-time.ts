import { CreationTimeField } from 'kira-core';

import { Draft, DraftMakerContext } from '../type';

export function makeCreationTimeDraft<GDE, WR>({
  colName,
  fieldName,
}: DraftMakerContext<CreationTimeField>): Draft<GDE, WR> {
  return {
    onCreate: {
      [colName]: {
        getTransactionCommit: async ({ snapshot: doc }) => ({
          tag: 'right',
          value: {
            [colName]: {
              [doc.id]: {
                op: 'update',
                onDocAbsent: 'doNotUpdate',
                data: {
                  [fieldName]: { type: 'creationTime' },
                },
              },
            },
          },
        }),
      },
    },
  };
}
