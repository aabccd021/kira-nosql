import { Spec } from 'kira-core';
import { None, Option, optionArrayMapSome, optionFromNullable, optionMapSome, Some } from 'trimop';

import { ActionTrigger, BuildDraft, ColDraft, Trigger, TriggerSnapshot } from './type';

function colDraftsToActionTrigger<S extends TriggerSnapshot>(
  colDraft: readonly Option<ColDraft<S>>[]
): Option<ActionTrigger<S>> {
  const definedColDraft = optionArrayMapSome(colDraft);
  const getTransactionCommits = optionArrayMapSome(
    definedColDraft.map((el) => el.getTransactionCommit)
  );
  const propagationOps = optionArrayMapSome(definedColDraft.map((el) => el.propagationOp));
  return getTransactionCommits.length === 0 && propagationOps.length === 0
    ? None()
    : Some({ getTransactionCommits, propagationOps });
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
    Object.entries(spec).map(([colName]) => [
      colName,
      {
        onCreate: colDraftsToActionTrigger(
          drafts.map((draft) =>
            optionMapSome(draft, (draft) =>
              optionMapSome(draft.onCreate, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          )
        ),
        onDelete: colDraftsToActionTrigger(
          drafts.map((draft) =>
            optionMapSome(draft, (draft) =>
              optionMapSome(draft.onDelete, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          )
        ),
        onUpdate: colDraftsToActionTrigger(
          drafts.map((draft) =>
            optionMapSome(draft, (draft) =>
              optionMapSome(draft.onUpdate, (actionDraft) =>
                optionFromNullable(actionDraft[colName])
              )
            )
          )
        ),
      },
    ])
  );
}
