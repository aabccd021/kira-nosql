import { CreationTimeField, CreationTimeFieldSpec } from 'kira-core';
import { none, right, some } from 'trimop';

import { Draft, DraftBuilderContext, UpdateDocCommit } from '../type';

export function makeCreationTimeDraft({
  context: { colName, fieldName },
}: {
  readonly context: DraftBuilderContext;
  readonly spec: CreationTimeFieldSpec;
}): Draft {
  return {
    onCreate: some({
      [colName]: {
        getTransactionCommit: some(async ({ snapshot }) =>
          right({
            [colName]: {
              [snapshot.id]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  [fieldName]: CreationTimeField(),
                },
              }),
            },
          })
        ),
        propagationOp: none(),
      },
    }),
    onDelete: none(),
    onUpdate: none(),
  };
}
