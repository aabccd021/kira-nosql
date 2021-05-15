import { Dictionary, FieldOf, Schema } from 'kira-core';

import { InField, OutField } from './doc-data';
import { Action, Actions, FieldToTrigger, TriggerType } from './type';

function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

function _schemaToActions<S extends Schema, T extends TriggerType>(
  schema: S,
  fieldToTrigger: FieldToTrigger<S, T>
): Dictionary<readonly Action<T>[]> {
  return Object.entries(schema.cols)
    .flatMap(([colName, fieldDict]) =>
      Object.entries(fieldDict).map(([fieldName, field]) =>
        fieldToTrigger({ schema, fieldName, field: field as FieldOf<S>, colName })
      )
    )
    .filter(isDefined)
    .reduce<Dictionary<readonly Action<T>[]>>(
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

export function schemaToTriggerActions<S extends Schema>({
  schema,
  fieldToTrigger,
}: {
  readonly schema: S;
  readonly fieldToTrigger: {
    readonly onCreate: FieldToTrigger<S, 'onCreate'>;
  };
}): Actions {
  return {
    onCreate: _schemaToActions(schema, fieldToTrigger.onCreate),
    onUpdate: {},
    onDelete: {},
  };
}

export function inToOutField([fieldName, inField]: readonly [string, InField]): readonly [
  string,
  OutField
] {
  if (inField.type === 'ref') {
    return [
      fieldName,
      {
        type: 'ref',
        value: Object.fromEntries(Object.entries(inField.value.data ?? []).map(inToOutField)),
      },
    ];
  }
  return [fieldName, inField];
}
