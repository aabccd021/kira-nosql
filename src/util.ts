import assertNever from 'assert-never';
import { Dictionary, FieldOf, Schema } from 'kira-core';

import { ReadDocData, ReadField, WriteField } from './doc-data';
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
    readonly onUpdate: FieldToTrigger<S, 'onUpdate', GDE, QE>;
    readonly onDelete: FieldToTrigger<S, 'onDelete', GDE, QE>;
  };
}): Actions<GDE, QE> {
  return {
    onCreate: _schemaToActions(schema, fieldToTrigger.onCreate),
    onUpdate: _schemaToActions(schema, fieldToTrigger.onUpdate),
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
        value: Object.fromEntries(Object.entries(inField.value.data).map(readToWriteField)),
      },
    ];
  }
  return [fieldName, inField];
}

export function getReadDocDataDiff({
  before,
  after,
}: {
  readonly before: ReadDocData;
  readonly after: ReadDocData;
}): ReadDocData {
  return Object.fromEntries(
    Object.entries(after).filter(
      ([fieldName, afterField]) =>
        !isEqualReadDocField({ afterField, beforeField: before[fieldName] })
    )
  );
}

function isEqualReadDocField({
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
