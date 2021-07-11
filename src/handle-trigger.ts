// import {
//   ActionResult,
//   AllOpTrigger,
//   DataTypeError,
//   DeleteDoc,
//   DocCommit,
//   DocKey,
//   Either,
//   GetDoc,
//   MergeDoc,
//   SnapshotOfTriggerType,
//   TriggerType,
// } from './type';

// function mergeActionResult(a1: ActionResult, a2: ActionResult): ActionResult {
//   return {
//     ...a2,
//     ...Object.fromEntries(
//       Object.entries(a1).map(([colName, col]) => {
//         const col2 = a2[colName] ?? {};
//         return [
//           colName,
//           {
//             ...col2,
//             ...Object.fromEntries(
//               /**
//                * Merge doc operations.
//                * Operation priority is delete > merge.
//                */
//               Object.entries(col).map<readonly [string, DocCommit]>(([docId, docOp]) => {
//                 const docOp2 = col2[docId];
//                 if (docOp.op === 'delete' || docOp2?.op === 'delete') {
//                   return [docId, { op: 'delete' }];
//                 }
//                 if (!docOp2) {
//                   return [docId, docOp];
//                 }
//                 /**
//                  * If both a1 and a2 provide merge value for the same field,
// value from a2 will be
//                  * used
//                  */
//                 return [
//                   docId,
//                   {
//                     op: 'merge',
//                     data: { ...docOp.data, ...docOp2.data },
//                   },
//                 ];
//               })
//             ),
//           },
//         ];
//       })
//     ),
//   };
// }

// export async function handleTrigger<T extends TriggerType, WR, GDE, QE>({
//   snapshot,
//   actions,
//   getDoc,
//   mergeDoc,
//   deleteDoc,
// }: {
//   readonly actions: readonly AllOpTrigger<T, GDE>[];
//   readonly snapshot: SnapshotOfTriggerType<T>;
//   readonly getDoc: GetDoc<GDE>;
//   readonly mergeDoc: MergeDoc<WR>;
//   readonly deleteDoc: DeleteDoc<WR>;
// }): Promise<Either<Promise<readonly PromiseSettledResult<WR>[]>, DataTypeError | GDE | QE>> {
//   return Promise.all(actions.map((action) => action({ getDoc, snapshot }))).then((updates) => {
//     const actionResult = updates.reduce<Either<ActionResult, DataTypeError | GDE | QE>>(
//       (prev, current) => {
//         if (prev.tag === 'left') return prev;
//         if (current.tag === 'left') return current;
//         return { tag: 'right', value: mergeActionResult(prev.value, current.value) };
//       },
//       { tag: 'right', value: {} }
//     );
//     if (actionResult.tag === 'left') return actionResult;
//     return {
//       tag: 'right',
//       value: Promise.allSettled(
//         Object.entries(actionResult.value).flatMap(([colName, col]) =>
//           Object.entries(col).map(([docId, docOp]) => {
//             const key: DocKey = {
//               col: { type: 'normal', name: colName },
//               id: docId,
//             };
//             return docOp.op === 'merge' ? mergeDoc(key, docOp.data) : deleteDoc(key);
//           })
//         )
//       ),
//     };
//   });
// }
