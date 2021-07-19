import { CreationTimeFieldSpec } from 'kira-core';

import { Draft, DraftMakerContext } from '../type';

export function makeCreationTimeDraft({
  context: { colName, fieldName },
}: {
  readonly context: DraftMakerContext;
  readonly spec: CreationTimeFieldSpec;
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
                    [fieldName]: { type: 'creationTime' },
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
