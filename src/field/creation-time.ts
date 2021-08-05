import { CreationTimeField, CreationTimeFieldSpec } from 'kira-core';
import { None, Right, Some } from 'trimop';

import { Draft, DraftBuilderContext, UpdateDocCommit } from '../type';

export function makeCreationTimeDraft({
  context: { colName, fieldName },
}: {
  readonly context: DraftBuilderContext;
  readonly spec: CreationTimeFieldSpec;
}): Draft {
  return {
    onCreate: Some({
      [colName]: {
        getTransactionCommit: Some(async ({ snapshot }) =>
          Right({
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
        propagationOp: None(),
      },
    }),
    onDelete: None(),
    onUpdate: None(),
  };
}
