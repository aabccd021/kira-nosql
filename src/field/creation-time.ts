import { CreationTimeField } from 'kira-core';

import { MakeTriggerContext, Trigger } from '../type';

export function makeCreationTimeTrigger<GDE, WR>({
  colName,
  fieldName,
}: MakeTriggerContext<CreationTimeField>): Trigger<GDE, WR> {
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
