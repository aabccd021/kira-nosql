import { RefField, SyncFields, ThisColRefer } from 'kira-core';

import { DocKey, GetDoc, MakeTriggerContext, MergeDoc, ReadDocChange, Trigger } from '../type';
import {
  DOC_IDS_FIELD_NAME,
  filterSyncFields,
  isEqualReadDocField,
  readToWriteField,
} from '../util';

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
}: MakeTriggerContext<RefField>): Trigger<GDE, WR> {
  return {
    onCreate: {
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

          const refDocData = refDoc.value.data;
          if (refDocData === undefined || fieldSpec.syncFields === undefined) {
            return { tag: 'right', value: {} };
          }

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
    },
    onUpdate: {
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
