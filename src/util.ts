import assertNever from 'assert-never';
import { SyncFields } from 'kira-core';

import { ReadDocData, ReadField, WriteField } from './doc-data';

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

export function readToWriteField([fieldName, inField]: readonly [string, ReadField]): readonly [
  string,
  WriteField
] {
  if (inField.type === 'ref') {
    return [
      fieldName,
      {
        type: 'ref',
        value: Object.fromEntries(Object.entries(inField.value.data).map(readToWriteField)),
      },
    ];
  }
  return [fieldName, inField];
}

export function filterSyncFields({
  data,
  syncFields,
}: {
  readonly data: ReadDocData;
  readonly syncFields: SyncFields;
}): ReadDocData | undefined {
  return Object.entries(syncFields).reduce<ReadDocData | undefined>((prev, [fieldName, field]) => {
    const diffField = data[fieldName];
    if (diffField !== undefined) {
      if (field === true) {
        return { ...prev, [fieldName]: diffField };
      }
      if (diffField.type === 'ref') {
        const data = filterSyncFields({ data: diffField.value.data, syncFields: field });
        if (data !== undefined) {
          return {
            ...prev,
            [fieldName]: {
              type: 'ref',
              value: { id: diffField.value.id, data },
            },
          };
        }
      }
    }
    return prev;
  }, undefined);
}

export function isEqualReadDocField({
  beforeField,
  afterField,
}: {
  readonly beforeField?: ReadField;
  readonly afterField: ReadField;
}): boolean {
  if (afterField.type === 'date') {
    return (
      beforeField?.type === 'date' && afterField.value.getTime() === beforeField.value.getTime()
    );
  }
  if (afterField.type === 'number') {
    return beforeField?.type === 'number' && afterField.value === beforeField.value;
  }
  if (afterField.type === 'string') {
    return beforeField?.type === 'string' && afterField.value === beforeField.value;
  }
  if (afterField.type === 'stringArray') {
    return (
      beforeField?.type === 'stringArray' &&
      afterField.value.length === beforeField.value.length &&
      afterField.value.every((val, idx) => val === beforeField.value[idx])
    );
  }
  if (afterField.type === 'ref') {
    return (
      beforeField?.type === 'ref' &&
      Object.entries(afterField.value.data).every(
        ([fieldName, aff]) =>
          afterField.value.id === beforeField.value.id &&
          isEqualReadDocField({
            afterField: aff,
            beforeField: beforeField.value.data[fieldName],
          })
      )
    );
  }
  assertNever(afterField);
}
