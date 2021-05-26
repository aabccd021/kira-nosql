import {
  CountField,
  CreationTimeField,
  ImageField,
  OwnerField,
  RefField,
  StringField,
} from 'kira-core';

import { MakeTriggerContext_1, MakeTriggerContext_2, Trigger } from './type';
import { readToWriteField } from './util';

export function makeOnCreateCountFieldTrigger<GDE>({
  colName,
  field: { countedCol, groupByRef },
  fieldName,
}: MakeTriggerContext_2<CountField>): Trigger<'onCreate', GDE> | undefined {
  return {
    [colName]: async ({ snapshot: doc }) => ({
      tag: 'right',
      value: {
        [colName]: {
          [doc.id]: {
            [fieldName]: { type: 'number', value: 0 },
          },
        },
      },
    }),
    [countedCol]: async ({ snapshot: document }) => {
      const counterDoc = document.data?.[groupByRef];
      if (counterDoc?.type !== 'ref') {
        return {
          tag: 'left',
          error: { errorType: 'invalid_data_type' },
        };
      }
      return {
        tag: 'right',
        value: {
          [colName]: {
            [counterDoc.value.id]: {
              [fieldName]: { type: 'increment', incrementValue: 1 },
            },
          },
        },
      };
    },
  };
}

export function makeOnCreateCreationTimeFieldTrigger<GDE>({
  colName,
  fieldName,
}: MakeTriggerContext_2<CreationTimeField>): Trigger<'onCreate', GDE> | undefined {
  return {
    [colName]: async ({ snapshot: doc }) => ({
      tag: 'right',
      value: {
        [colName]: {
          [doc.id]: {
            [fieldName]: { type: 'creationTime' },
          },
        },
      },
    }),
  };
}

export function makeOnCreateImageFieldTrigger<GDE>(
  _: MakeTriggerContext_2<ImageField>
): Trigger<'onCreate', GDE> | undefined {
  return undefined;
}

export function makeOnCreateOwnerFieldTrigger<GDE>({
  colName,
  field: { syncFields },
  userColName,
  fieldName,
}: MakeTriggerContext_1<OwnerField>): Trigger<'onCreate', GDE> | undefined {
  return {
    [colName]: async ({ getDoc, snapshot: doc }) => {
      const refField = doc.data?.[fieldName];
      if (refField?.type !== 'ref') {
        return { tag: 'left', error: { errorType: 'invalid_data_type' } };
      }
      const refDoc = await getDoc({ col: userColName, id: refField.value.id });
      if (refDoc.tag === 'left') return refDoc;

      const refDocValueData = refDoc.value.data;
      if (refDocValueData === undefined || syncFields === undefined) {
        return { tag: 'right', value: {} };
      }

      const syncFieldNames = Object.keys(syncFields);
      return {
        tag: 'right',
        value: {
          [colName]: {
            [doc.id]: {
              [fieldName]: {
                type: 'ref',
                value: Object.fromEntries(
                  Object.entries(refDocValueData)
                    .filter(([fieldName]) => syncFieldNames.includes(fieldName))
                    .map(readToWriteField)
                ),
              },
            },
          },
        },
      };
    },
  };
}

export function makeOnCreateRefFieldTrigger<GDE>({
  colName,
  field: { refCol, syncFields },
  fieldName,
}: MakeTriggerContext_2<RefField>): Trigger<'onCreate', GDE> | undefined {
  return {
    [colName]: async ({ getDoc, snapshot: doc }) => {
      const refField = doc.data?.[fieldName];
      if (refField?.type !== 'ref') {
        return { tag: 'left', error: { errorType: 'invalid_data_type' } };
      }
      const refDoc = await getDoc({ col: refCol, id: refField.value.id });
      if (refDoc.tag === 'left') return refDoc;

      const refDocValueData = refDoc.value.data;
      if (refDocValueData === undefined || syncFields === undefined) {
        return { tag: 'right', value: {} };
      }

      const syncFieldNames = Object.keys(syncFields);
      return {
        tag: 'right',
        value: {
          [colName]: {
            [doc.id]: {
              [fieldName]: {
                type: 'ref',
                value: Object.fromEntries(
                  Object.entries(refDocValueData)
                    .filter(([fieldName]) => syncFieldNames.includes(fieldName))
                    .map(readToWriteField)
                ),
              },
            },
          },
        },
      };
    },
  };
}

export function makeOnCreateStringFieldTrigger<GDE>(
  _: MakeTriggerContext_2<StringField>
): Trigger<'onCreate', GDE> | undefined {
  return undefined;
}
