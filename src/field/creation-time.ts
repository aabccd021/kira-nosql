import { CreationTimeField, CreationTimeFieldSpec } from 'kira-core';
import { Value } from 'trimop';

import { Draft, DraftMakerContext, UpdateDocCommit } from '../type';

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
          return Value({
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
