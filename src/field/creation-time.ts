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
