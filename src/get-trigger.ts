import { Spec } from 'kira-core';
import { isSome, none, Option, optionFromNullable, optionMapSome, some } from 'trimop';

import { ActionTrigger, BuildDraft, ColDraft, Trigger, TriggerSnapshot } from './type';

function colDraftsToActionTrigger<S extends TriggerSnapshot>(
  colDraft: readonly Option<ColDraft<S>>[]
): Option<ActionTrigger<S>> {
  const definedColDraft = colDraft.filter(isSome);
  if (definedColDraft.length === 0) {
    return none();
  }
  // definedColDraft.map((x) => x.value)
  return some({
    getTransactionCommits: definedColDraft
      .map((el) => el.value.getTransactionCommit)
      .filter(isSome)
      .map((el) => el.value),
    propagationOps: definedColDraft
      .map((el) => el.value.propagationOp)
      .filter(isSome)
      .map((el) => el.value),
  });
}

export function getTrigger({
  spec,
  buildDraft,
}: {
  readonly buildDraft: BuildDraft;
  readonly spec: Spec;
}): Trigger {
  const drafts = Object.entries(spec).flatMap(([colName, docFieldSpecs]) =>
    Object.entries(docFieldSpecs).map(([fieldName, spec]) =>
      buildDraft({ context: { colName, fieldName }, spec })
    )
  );
  return Object.fromEntries(
    Object.entries(spec).map(([colName]) => {
      return [
        colName,
        {
          onCreate: colDraftsToActionTrigger(
            drafts.map((draft) =>
              optionMapSome(draft.onCreate, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          ),
          onDelete: colDraftsToActionTrigger(
            drafts.map((draft) =>
              optionMapSome(draft.onDelete, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          ),
          onUpdate: colDraftsToActionTrigger(
            drafts.map((draft) =>
              optionMapSome(draft.onUpdate, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          ),
        },
      ];
    })
  );
}
