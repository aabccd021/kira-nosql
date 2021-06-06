import assertNever from 'assert-never';
import { Dictionary, FieldOf, Schema } from 'kira-core';

import { ReadField, WriteDocData, WriteField } from './doc-data';
import { Action, Actions, FieldToTrigger, TriggerType } from './type';

function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

function _schemaToActions<S extends Schema, T extends TriggerType, GDE, QE>(
  schema: S,
  fieldToTrigger: FieldToTrigger<S, T, GDE, QE>
): Dictionary<readonly Action<T, GDE, QE>[]> {
  return Object.entries(schema.cols)
    .flatMap(([colName, fieldDict]) =>
      Object.entries(fieldDict).map(([fieldName, field]) =>
        fieldToTrigger({ schema, fieldName, field: field as FieldOf<S>, colName })
      )
    )
    .filter(isDefined)
    .reduce<Dictionary<readonly Action<T, GDE, QE>[]>>(
      (prev, actionDict) =>
        Object.entries(actionDict).reduce(
          (prev, [colName, action]) => ({
            ...prev,
            [colName]: [...(prev[colName] ?? []), action],
          }),
          prev
        ),
      {}
    );
}

export function schemaToTriggerActions<S extends Schema, GDE, QE>({
  schema,
  fieldToTrigger,
}: {
  readonly schema: S;
  readonly fieldToTrigger: {
    readonly onCreate: FieldToTrigger<S, 'onCreate', GDE, QE>;
    readonly onDelete: FieldToTrigger<S, 'onDelete', GDE, QE>;
  };
}): Actions<GDE, QE> {
  return {
    onCreate: _schemaToActions(schema, fieldToTrigger.onCreate),
    onUpdate: {},
    onDelete: _schemaToActions(schema, fieldToTrigger.onDelete),
  };
}

export function readToWriteField([fieldName, inField]: readonly [string, ReadField]): readonly [
  string,
  WriteField
] {
  if (inField.type === 'ref') {
    return [
      fieldName,
      {
        type: 'ref',
        value: Object.fromEntries(Object.entries(inField.value.data ?? []).map(readToWriteField)),
      },
    ];
  }
  return [fieldName, inField];
}

export function writeDocDataIsEqual(d1: WriteDocData, d2: WriteDocData): boolean {
  return Object.entries(d1).every(([fieldName, f1]) => {
    const f2 = d2[fieldName];
    if (f1.type === 'creationTime') {
      return f2?.type === 'creationTime';
    }
    if (f1.type === 'date') {
      return f2?.type === 'date' && f1.value.getTime() === f2.value.getTime();
    }
    if (f1.type === 'increment') {
      return f2?.type === 'increment' && f1.incrementValue === f2.incrementValue;
    }
    if (f1.type === 'number') {
      return f2?.type === 'number' && f1.value === f2.value;
    }
    if (f1.type === 'string') {
      return f2?.type === 'string' && f1.value === f2.value;
    }
    if (f1.type === 'ref') {
      return f2?.type === 'ref' && writeDocDataIsEqual(f1.value, f2.value);
    }
    assertNever(f1);
  });
}
