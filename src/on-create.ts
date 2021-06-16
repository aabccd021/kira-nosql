import {
  CountField,
  CreationTimeField,
  ImageField,
  OwnerField,
  RefField,
  StringField,
} from 'kira-core';

import { ColsAction, MakeTriggerContext_1, MakeTriggerContext_2 } from './type';
import { readToWriteField } from './util';

export function makeOnCreateCountFieldTrigger<GDE, WR>({
  colName,
  field: { countedCol, groupByRef },
  fieldName,
}: MakeTriggerContext_2<CountField>): ColsAction<'onCreate', GDE, WR> {
  return {
    [colName]: {
      getTransactionCommit: async ({ snapshot: doc }) => ({
        tag: 'right',
        value: {
          [colName]: {
            [doc.id]: {
              op: 'merge',
              data: {
                [fieldName]: { type: 'number', value: 0 },
              },
            },
          },
        },
      }),
    },
    [countedCol]: {
      getTransactionCommit: async ({ snapshot: document }) => {
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
                op: 'merge',
                data: {
                  [fieldName]: { type: 'increment', incrementValue: 1 },
                },
              },
            },
          },
        };
      },
    },
  };
}

export function makeOnCreateCreationTimeFieldTrigger<GDE, WR>({
  colName,
  fieldName,
}: MakeTriggerContext_2<CreationTimeField>): ColsAction<'onCreate', GDE, WR> {
  return {
    [colName]: {
      getTransactionCommit: async ({ snapshot: doc }) => ({
        tag: 'right',
        value: {
          [colName]: {
            [doc.id]: {
              op: 'merge',
              data: {
                [fieldName]: { type: 'creationTime' },
              },
            },
          },
        },
      }),
    },
  };
}

export function makeOnCreateImageFieldTrigger<GDE, WR>(
  _: MakeTriggerContext_2<ImageField>
): ColsAction<'onCreate', GDE, WR> {
  return {};
}

export function makeOnCreateOwnerFieldTrigger<GDE, WR>({
  colName,
  field: { syncFields },
  userCol: userColName,
  fieldName,
}: MakeTriggerContext_1<OwnerField>): ColsAction<'onCreate', GDE, WR> {
  return {
    [colName]: {
      getTransactionCommit: async ({ getDoc, snapshot: doc }) => {
        const refField = doc.data?.[fieldName];
        if (refField?.type !== 'ref') {
          return { tag: 'left', error: { errorType: 'invalid_data_type' } };
        }
        const refDoc = await getDoc({
          col: { type: 'normal', name: userColName },
          id: refField.value.id,
        });
        if (refDoc.tag === 'left') return refDoc;

        const refDocData = refDoc.value.data;
        if (refDocData === undefined || syncFields === undefined) {
          return { tag: 'right', value: {} };
        }

        const syncFieldNames = Object.keys(syncFields);
        return {
          tag: 'right',
          value: {
            [colName]: {
              [doc.id]: {
                op: 'merge',
                data: {
                  [fieldName]: {
                    type: 'ref',
                    value: Object.fromEntries(
                      Object.entries(refDocData)
                        .filter(([fieldName]) => syncFieldNames.includes(fieldName))
                        .map(readToWriteField)
                    ),
                  },
                },
              },
            },
          },
        };
      },
    },
  };
}

export function makeOnCreateRefFieldTrigger<GDE, WR>({
  colName,
  field: { refCol, syncFields },
  fieldName,
}: MakeTriggerContext_2<RefField>): ColsAction<'onCreate', GDE, WR> {
  return {
    [colName]: {
      getTransactionCommit: async ({ getDoc, snapshot: doc }) => {
        const refField = doc.data?.[fieldName];
        if (refField?.type !== 'ref') {
          return { tag: 'left', error: { errorType: 'invalid_data_type' } };
        }
        const refDoc = await getDoc({
          col: { type: 'normal', name: refCol },
          id: refField.value.id,
        });
        if (refDoc.tag === 'left') return refDoc;

        const refDocData = refDoc.value.data;
        if (refDocData === undefined || syncFields === undefined) {
          return { tag: 'right', value: {} };
        }

        const syncFieldNames = Object.keys(syncFields);
        return {
          tag: 'right',
          value: {
            [colName]: {
              [doc.id]: {
                op: 'merge',
                data: {
                  [fieldName]: {
                    type: 'ref',
                    value: Object.fromEntries(
                      Object.entries(refDocData)
                        .filter(([fieldName]) => syncFieldNames.includes(fieldName))
                        .map(readToWriteField)
                    ),
                  },
                },
              },
            },
          },
        };
      },
    },
  };
}

export function makeOnCreateStringFieldTrigger<GDE, WR>(
  _: MakeTriggerContext_2<StringField>
): ColsAction<'onCreate', GDE, WR> {
  return {};
}
