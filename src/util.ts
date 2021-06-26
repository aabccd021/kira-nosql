export const DOC_IDS_FIELD_NAME = 'docIds';

// function isDefined<T>(t: T | undefined): t is T {
// return t !== undefined;
// }

// function schemaToConsistency<S extends Schema, T extends TriggerType, GDE>(
//   schema: S,
//   fieldToTrigger: FieldToTrigger<S, T, GDE>,
//   consistency: CONSISTENCY
// ): Dictionary<readonly AllOpTrigger<T, GDE>[]> {
//   return Object.entries(schema.cols)
//     .flatMap(([colName, fieldDict]) =>
//       Object.entries(fieldDict).map(([fieldName, field]) =>
//         fieldToTrigger({ schema, fieldName, field: field as FieldOf<S>, colName })
//       )
//     )
//     .filter(isDefined)
//     .reduce<Dictionary<readonly AllOpTrigger<T, GDE>[]>>(
//       (prev, actionDict) =>
//         Object.entries(actionDict[consistency] ?? {}).reduce(
//           (prev, [colName, action]) => ({
//             ...prev,
//             [colName]: [...(prev[colName] ?? []), action],
//           }),
//           prev
//         ),
//       {}
//     );
// }
