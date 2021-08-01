import { CreationTimeField, CreationTimeFieldSpec } from 'kira-core';
import { Value } from 'trimop';

import { Draft, DraftBuilderContext, UpdateDocCommit } from '../type';

export function makeCreationTimeDraft({
  context: { colName, fieldName },
}: {
  readonly context: DraftBuilderContext;
  readonly spec: CreationTimeFieldSpec;
}): Draft {
  return {
    onCreate: {
      [colName]: {
        getTransactionCommit: async ({ snapshot }) =>
          Value({
            [colName]: {
              [snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  [fieldName]: CreationTimeField(),
                },
              }),
            },
          }),
      },
    },
  };
}
