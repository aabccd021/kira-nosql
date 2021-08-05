import { ActionTrigger, DeleteDoc, ExecOnRelDocs, TriggerSnapshot, UpdateDoc } from './type';

/**
 *
 * @param param0
 * @returns
 */
export function execPropagationOps<S extends TriggerSnapshot>({
  actionTrigger,
  snapshot,
  updateDoc,
  deleteDoc,
  execOnRelDocs,
}: {
  readonly actionTrigger: ActionTrigger<S>;
  readonly deleteDoc: DeleteDoc;
  readonly execOnRelDocs: ExecOnRelDocs;
  readonly snapshot: S;
  readonly updateDoc: UpdateDoc;
}): Promise<unknown> {
  return Promise.all(
    actionTrigger.propagationOps.map((propagationOp) =>
      propagationOp({ deleteDoc, execOnRelDocs, snapshot, updateDoc })
    )
  );
}
