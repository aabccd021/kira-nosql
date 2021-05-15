import {
  CountField,
  CreationTimeField,
  Dictionary,
  ImageField,
  OwnerField,
  RefField,
  StringField,
} from 'kira-core';

import { MakeTrigger_1, MakeTrigger_2, Trigger } from './type';
import { inToOutField } from './util';

function copyRefField({
  syncFields,
  refCol,
  colName,
  fieldName,
}: {
  readonly refCol: string;
  readonly syncFields?: Dictionary<true>;
  readonly colName: string;
  readonly fieldName: string;
}): Trigger<'onCreate'> {
  return {
    [colName]: async ({ getDoc, snapshot: doc }) => {
      const refField = doc.data?.[fieldName];
      if (refField?.type !== 'ref') {
        return { tag: 'left', error: { errorType: 'invalid_data_type' } };
      }
      return {
        tag: 'right',
        value: {
          [colName]: {
            [doc.id]: {
              [fieldName]: {
                type: 'ref',
                value: await getDoc({ col: refCol, id: refField.value.id }).then((refDoc) => {
                  const syncFieldNames = Object.keys(syncFields ?? {});
                  return Object.fromEntries(
                    Object.entries(refDoc.data ?? {})
                      .filter(([fieldName]) => syncFieldNames.includes(fieldName))
                      .map(inToOutField)
                  );
                }),
              },
            },
          },
        },
      };
    },
  };
}

export const makeOnCreateCountFieldTrigger: MakeTrigger_2<'onCreate', CountField> = ({
  colName,
  field: { countedCol, groupByRef },
  fieldName,
}) => ({
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
});

export const makeOnCreateCreationTimeFieldTrigger: MakeTrigger_2<'onCreate', CreationTimeField> = ({
  colName,
  fieldName,
}) => ({
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
});

// eslint-disable-next-line functional/functional-parameters
export const makeOnCreateImageFieldTrigger: MakeTrigger_2<'onCreate', ImageField> = () => undefined;

export const makeOnCreateOwnerFieldTrigger: MakeTrigger_1<'onCreate', OwnerField> = ({
  colName,
  userColName,
  fieldName,
  field: { syncFields },
}) => copyRefField({ refCol: userColName, fieldName, colName, syncFields });

export const makeOnCreateRefFieldTrigger: MakeTrigger_2<'onCreate', RefField> = ({
  colName,
  fieldName,
  field: { syncFields, refCol },
}) => copyRefField({ refCol, fieldName, colName, syncFields });

// eslint-disable-next-line functional/functional-parameters
export const makeOnCreateStringFieldTrigger: MakeTrigger_2<'onCreate', StringField> = () =>
  undefined;
