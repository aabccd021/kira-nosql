import assertNever from 'assert-never';
import { RefField, SyncFields, ThisColRefer } from 'kira-core';

import { ReadDocData, ReadField, WriteField } from '../data';
import { DocKey, Draft, DraftMakerContext, GetDoc, MergeDoc, ReadDocChange } from '../type';
import { DOC_IDS_FIELD_NAME } from '../util';

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

export function filterSyncFields({
  data,
  syncFields,
}: {
  readonly data: ReadDocData;
  readonly syncFields: SyncFields;
}): ReadDocData | undefined {
  return Object.entries(syncFields).reduce<ReadDocData | undefined>((prev, [fieldName, field]) => {
    const diffField = data[fieldName];
    if (diffField !== undefined) {
      if (field === true) {
        return { ...prev, [fieldName]: diffField };
      }
      if (diffField.type === 'ref') {
        const data = filterSyncFields({ data: diffField.value.data, syncFields: field });
        if (data !== undefined) {
          return {
            ...prev,
            [fieldName]: {
              type: 'ref',
              value: { id: diffField.value.id, data },
            },
          };
        }
      }
    }
    return prev;
  }, undefined);
}

export function isEqualReadDocField({
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
  if (afterField.type === 'stringArray') {
    return (
      beforeField?.type === 'stringArray' &&
      afterField.value.length === beforeField.value.length &&
      afterField.value.every((val, idx) => val === beforeField.value[idx])
    );
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

async function propagateRefUpdate<GDE, WR>({
  getDoc,
  mergeDoc,
  refedDoc,
  referField,
  referCol,
  fieldSpec: { syncFields, refedCol, thisColRefers },
}: {
  readonly getDoc: GetDoc<GDE>;
  readonly mergeDoc: MergeDoc<WR>;
  readonly refedDoc: ReadDocChange;
  readonly referField: string;
  readonly referCol: string;
  readonly fieldSpec: {
    readonly refedCol: string;
    readonly syncFields: SyncFields;
    readonly thisColRefers: readonly ThisColRefer[];
  };
}): Promise<void> {
  const updateDiff = Object.fromEntries(
    Object.entries(refedDoc.after).filter(
      ([fieldName, afterField]) =>
        !isEqualReadDocField({ afterField, beforeField: refedDoc.before[fieldName] })
    )
  );

  const syncData = filterSyncFields({ data: updateDiff, syncFields });

  if (syncData === undefined) {
    return;
  }

  const relDoc = await getDoc({
    key: {
      id: refedDoc.id,
      col: {
        type: 'rel',
        refedCol,
        referField,
        referCol,
      },
    },
  });

  if (relDoc.tag === 'left') {
    return;
  }

  const referDocIds = relDoc.value.data[DOC_IDS_FIELD_NAME];
  if (referDocIds?.type !== 'stringArray') {
    return;
  }

  referDocIds.value.forEach((referDocId) => {
    mergeDoc({
      key: {
        col: { type: 'normal', name: referCol },
        id: referDocId,
      },
      docData: {
        [referField]: {
          type: 'ref',
          value: Object.fromEntries(Object.entries(syncData).map(readToWriteField)),
        },
      },
    });
    thisColRefers.forEach((thisColRefer) => {
      thisColRefer.fields.forEach((thisColReferField) => {
        propagateRefUpdate({
          getDoc,
          mergeDoc,
          fieldSpec: {
            refedCol: referCol,
            syncFields: thisColReferField.syncFields,
            thisColRefers: thisColRefer.thisColRefers,
          },
          referCol: thisColRefer.colName,
          referField: thisColReferField.name,
          refedDoc: {
            id: referDocId,
            before: {},
            after: {
              [referField]: {
                type: 'ref',
                value: { id: refedDoc.id, data: syncData },
              },
            },
          },
        });
      });
    });
  });
}

export function makeRefTrigger<GDE, WR>({
  colName,
  fieldSpec,
  fieldName,
}: DraftMakerContext<RefField>): Draft<GDE, WR> {
  const needSync = Object.keys(fieldSpec.syncFields).length !== 0;
  return {
    onCreate: !needSync
      ? undefined
      : {
          [colName]: {
            getTransactionCommit: async ({ getDoc, snapshot: doc }) => {
              const refField = doc.data?.[fieldName];
              if (refField?.type !== 'ref') {
                return { tag: 'left', error: { errorType: 'invalid_data_type' } };
              }

              const refDoc = await getDoc({
                key: {
                  col: { type: 'normal', name: fieldSpec.refedCol },
                  id: refField.value.id,
                },
              });

              if (refDoc.tag === 'left') return refDoc;

              const syncFieldNames = Object.keys(fieldSpec.syncFields);
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
                            Object.entries(refDoc.value.data)
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
        },
    onUpdate: !needSync
      ? undefined
      : {
          [fieldSpec.refedCol]: {
            mayFailOp: async ({ getDoc, mergeDoc, snapshot }) => {
              propagateRefUpdate({
                getDoc,
                mergeDoc,
                fieldSpec: fieldSpec,
                refedDoc: snapshot,
                referCol: colName,
                referField: fieldName,
              });
            },
          },
        },
    onDelete: {
      [fieldSpec.refedCol]: {
        mayFailOp: async ({ getDoc, deleteDoc, snapshot: refedDoc }) => {
          const relDocKey: DocKey = {
            id: refedDoc.id,
            col: {
              type: 'rel',
              referField: fieldName,
              referCol: colName,
              refedCol: fieldSpec.refedCol,
            },
          };
          const relDoc = await getDoc({ key: relDocKey });

          if (relDoc.tag === 'left') {
            return;
          }

          const referDocIds = relDoc.value.data[DOC_IDS_FIELD_NAME];
          if (referDocIds?.type !== 'stringArray') {
            return;
          }

          deleteDoc({ key: relDocKey });

          referDocIds.value.forEach((referDocId) =>
            deleteDoc({
              key: {
                id: referDocId,
                col: { type: 'normal', name: colName },
              },
            })
          );
          return;
        },
      },
    },
  };
}
