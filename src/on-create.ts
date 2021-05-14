import { assertNever } from 'assert-never';

import { Dictionary, DocSnapshot, MakeTrigger, RefField, Trigger } from './types';

export const makeOnCreateTrigger: MakeTrigger<DocSnapshot> = ({
  colName,
  field,
  fieldName,
  userColName,
}) => {
  function copyRefField({
    syncFields,
    refCol,
  }: {
    readonly refCol: string;
    readonly syncFields?: Dictionary<true>;
  }): Trigger<DocSnapshot> {
    return {
      [colName]: async ({ getDoc, snapshot: doc }) => {
        const refId = (doc.data?.[fieldName] as RefField)?.id;
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

  if (field.type === 'count') {
    const { countedCol, groupByRef } = field;
    return {
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
        const counterDocumentId = (data[groupByRef] as RefField).id;
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
    };
  }
  if (field.type === 'creationTime') {
    return {
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
    };
  }
  if (field.type === 'image') return undefined;
  if (field.type === 'owner') {
    const { syncFields } = field;
    return copyRefField({ refCol: userColName, syncFields });
  }
  if (field.type === 'ref') {
    const { syncFields, refCol } = field;
    return copyRefField({ refCol, syncFields });
  }
  if (field.type === 'string') return undefined;
  // eslint-disable-next-line functional/no-expression-statement
  assertNever(field);
};
