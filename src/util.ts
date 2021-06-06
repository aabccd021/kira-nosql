import { Dictionary, FieldOf, Schema } from 'kira-core';

import { ReadField, WriteField } from './doc-data';
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
  };
}): Actions<GDE, QE> {
  return {
    onCreate: _schemaToActions(schema, fieldToTrigger.onCreate),
    onUpdate: {},
    onDelete: {},
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
