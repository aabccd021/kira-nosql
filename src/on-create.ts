import { CountField, CreationTimeField, ImageField, OwnerField, RefField } from 'kira-core';

import { Dictionary, MakeTrigger_1, MakeTrigger_2, RefFieldData, Trigger } from './types';

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
      const refId = (doc.data?.[fieldName] as RefFieldData)?.id;
      if (typeof refId !== 'string') {
        return { tag: 'left', error: { errorType: 'invalid_data_type' } };
      }
      return {
        tag: 'right',
        value: {
          [colName]: {
            [doc.id]: {
              [fieldName]: await getDoc({ col: refCol, id: refId }).then((refDoc) => {
                const syncFieldNames = Object.keys(syncFields ?? {});
                return Object.fromEntries(
                  Object.entries(refDoc.data).filter(([key]) => syncFieldNames.includes(key))
                );
              }),
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
          [fieldName]: 0,
        },
      },
    },
  }),
  [countedCol]: async ({ snapshot: document }) => {
    const data = document.data;
    const counterDocumentId = (data[groupByRef] as RefFieldData).id;
    if (typeof counterDocumentId !== 'string') {
      return {
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      };
    }
    return {
      tag: 'right',
      value: {
        [colName]: {
          [counterDocumentId]: {
            [fieldName]: { __fieldType: 'increment', value: 1 },
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
          [fieldName]: { __fieldType: 'creationTime' },
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
export const makeOnCreateStringFieldTrigger: MakeTrigger_2<'onCreate', ImageField> = () => undefined;
