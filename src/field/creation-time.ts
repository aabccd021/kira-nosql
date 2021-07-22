import { CreationTimeFieldSpec } from 'kira-core';

import { CreationTimeField, Draft, DraftMakerContext, Right, UpdateDocCommit } from '../type';

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
          return Right({
            [colName]: {
              [snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                data: {
                  [fieldName]: CreationTimeField(),
                },
              }),
            },
          });
        },
      },
    },
  };
}
