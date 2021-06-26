import { CountField, CreationTimeField, ImageField, RefField, StringField } from 'kira-core';

import { ColsAction, MakeTriggerContext } from './type';
import { readToWriteField } from './util';

export function makeOnCreateCountFieldTrigger<GDE, WR>({
  colName,
  field: { countedCol, groupByRef },
  fieldName,
}: MakeTriggerContext<CountField>): ColsAction<'onCreate', GDE, WR> {
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
}: MakeTriggerContext<CreationTimeField>): ColsAction<'onCreate', GDE, WR> {
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
  _: MakeTriggerContext<ImageField>
): ColsAction<'onCreate', GDE, WR> {
  return {};
}

export function makeOnCreateRefFieldTrigger<GDE, WR>({
  colName,
  field: { refedCol, syncFields },
  fieldName,
}: MakeTriggerContext<RefField>): ColsAction<'onCreate', GDE, WR> {
  return {
    [colName]: {
      getTransactionCommit: async ({ getDoc, snapshot: doc }) => {
        const refField = doc.data?.[fieldName];
        if (refField?.type !== 'ref') {
          return { tag: 'left', error: { errorType: 'invalid_data_type' } };
        }
        const refDoc = await getDoc({
          col: { type: 'normal', name: refedCol },
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
  _: MakeTriggerContext<StringField>
): ColsAction<'onCreate', GDE, WR> {
  return {};
}
