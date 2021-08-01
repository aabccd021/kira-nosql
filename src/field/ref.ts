import {
  ColRefer,
  filterSyncedFields,
  InvalidFieldTypeFailure,
  isFieldEqual,
  RefField,
  RefFieldSpec,
  RefUpdateField,
  SyncedFields,
} from 'kira-core';
import { Failed, foldValue, isDefined, Value } from 'trimop';

import {
  DocChange,
  Draft,
  DraftBuilderContext,
  ExecOnRelDocs,
  UpdateDoc,
  UpdateDocCommit,
} from '../type';

async function propagateRefUpdate({
  updateDoc,
  execOnRelDocs,
  refedDoc,
  referField,
  referCol,
  spec: { syncedFields, refedCol, thisColRefers },
}: {
  readonly execOnRelDocs: ExecOnRelDocs;
  readonly refedDoc: DocChange;
  readonly referCol: string;
  readonly referField: string;
  readonly spec: {
    readonly refedCol: string;
    readonly syncedFields: SyncedFields;
    readonly thisColRefers: readonly ColRefer[];
  };
  readonly updateDoc: UpdateDoc;
}): Promise<unknown> {
  return foldValue(
    filterSyncedFields({
      doc: Object.fromEntries(
        Object.entries(refedDoc.after).filter(
          ([fieldName, afterField]) => !isFieldEqual(afterField, refedDoc.before[fieldName])
        )
      ),
      syncedFields,
    }),
    (syncData) =>
      Value(
        !isDefined(syncData)
          ? undefined
          : execOnRelDocs(
              {
                refedCol,
                refedId: refedDoc.id,
                referCol,
                referField,
              },
              async ({ id }) =>
                foldValue(
                  await updateDoc({
                    key: { col: referCol, id },
                    writeDoc: {
                      [referField]: RefUpdateField(syncData),
                    },
                  }),
                  () =>
                    Value(
                      Promise.all(
                        thisColRefers.flatMap((thisColRefer) =>
                          thisColRefer.fields.map((thisColReferField) =>
                            propagateRefUpdate({
                              execOnRelDocs,
                              refedDoc: {
                                after: {
                                  [referField]: RefField({
                                    doc: syncData,
                                    id: refedDoc.id,
                                  }),
                                },
                                before: {},
                                id,
                              },
                              referCol: thisColRefer.colName,
                              referField: thisColReferField.name,
                              spec: {
                                refedCol: referCol,
                                syncedFields: thisColReferField.syncedFields,
                                thisColRefers: thisColRefer.thisColRefers,
                              },
                              updateDoc,
                            })
                          )
                        )
                      )
                    )
                )
            )
      )
  );
}

export function makeRefDraft({
  context: { colName, fieldName },
  spec,
}: {
  readonly context: DraftBuilderContext;
  readonly spec: RefFieldSpec;
}): Draft {
  const needSync = Object.keys(spec.syncedFields).length !== 0;
  return {
    onCreate: needSync
      ? {
          [colName]: {
            getTransactionCommit: async ({ getDoc, snapshot }) => {
              const refField = snapshot.doc?.[fieldName];

              return refField?._type !== 'Ref'
                ? Failed(
                    InvalidFieldTypeFailure({
                      expectedFieldTypes: ['Ref'],
                      field: refField,
                    })
                  )
                : foldValue(
                    await getDoc({ col: spec.refedCol, id: refField.snapshot.id }),
                    (refedDoc) => {
                      const syncedFieldNames = Object.keys(spec.syncedFields);
                      return Value({
                        [colName]: {
                          [snapshot.id]: UpdateDocCommit({
                            onDocAbsent: 'doNotUpdate',
                            writeDoc: {
                              [fieldName]: RefUpdateField(
                                Object.fromEntries(
                                  Object.entries(refedDoc).filter(([fieldName]) =>
                                    syncedFieldNames.includes(fieldName)
                                  )
                                )
                              ),
                            },
                          }),
                        },
                      });
                    }
                  );
            },
          },
        }
      : undefined,
    onDelete: {
      [spec.refedCol]: {
        propagationOp: ({ execOnRelDocs, deleteDoc, snapshot: refed }) =>
          execOnRelDocs(
            {
              refedCol: spec.refedCol,
              refedId: refed.id,
              referCol: colName,
              referField: fieldName,
            },
            (doc) => deleteDoc({ col: colName, id: doc.id })
          ),
      },
    },
    onUpdate: needSync
      ? {
          [spec.refedCol]: {
            propagationOp: ({ execOnRelDocs, updateDoc, snapshot }) =>
              propagateRefUpdate({
                execOnRelDocs,
                refedDoc: snapshot,
                referCol: colName,
                referField: fieldName,
                spec,
                updateDoc,
              }),
          },
        }
      : undefined,
  };
}
