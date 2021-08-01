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
  DraftMakerContext,
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
}): Promise<void> {
  const updateDiff = Object.fromEntries(
    Object.entries(refedDoc.after).filter(
      ([fieldName, afterField]) => !isFieldEqual(afterField, refedDoc.before[fieldName])
    )
  );

  foldValue(filterSyncedFields({ doc: updateDiff, syncedFields }), (syncData) => {
    if (!isDefined(syncData)) {
      return Value(Promise.resolve(undefined));
    }

    return Value(
      execOnRelDocs({
        exec: async ({ id }) => {
          await updateDoc({
            docData: {
              [referField]: RefUpdateField(syncData),
            },
            key: { col: referCol, id },
          });

          thisColRefers.forEach((thisColRefer) => {
            thisColRefer.fields.forEach((thisColReferField) => {
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
              });
            });
          });
        },
        relKey: {
          refedCol,
          refedId: refedDoc.id,
          referCol,
          referField,
        },
      })
    );
  });
}

export function makeRefDraft({
  context: { colName, fieldName },
  spec,
}: {
  readonly context: DraftMakerContext;
  readonly spec: RefFieldSpec;
}): Draft {
  const needSync = Object.keys(spec.syncedFields).length !== 0;
  return {
    onCreate: needSync
      ? {
          [colName]: {
            getTransactionCommit: async ({ getDoc, snapshot }) => {
              const refField = snapshot.doc?.[fieldName];

              if (refField?._type !== 'ref') {
                return Failed(
                  InvalidFieldTypeFailure({
                    expectedFieldTypes: ['ref'],
                    field: refField,
                  })
                );
              }

              return foldValue(
                await getDoc({ col: spec.refedCol, id: refField.snapshot.id }),
                (refedDoc) => {
                  const syncedFieldNames = Object.keys(spec.syncedFields);
                  return Value({
                    [colName]: {
                      [snapshot.id]: UpdateDocCommit({
                        data: {
                          [fieldName]: RefUpdateField(
                            Object.fromEntries(
                              Object.entries(refedDoc).filter(([fieldName]) =>
                                syncedFieldNames.includes(fieldName)
                              )
                            )
                          ),
                        },
                        onDocAbsent: 'doNotUpdate',
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
        mayFailOp: async ({ execOnRelDocs, deleteDoc, snapshot: refed }) =>
          execOnRelDocs({
            exec: (doc) => deleteDoc({ col: colName, id: doc.id }),
            relKey: {
              refedCol: spec.refedCol,
              refedId: refed.id,
              referCol: colName,
              referField: fieldName,
            },
          }),
      },
    },
    onUpdate: needSync
      ? {
          [spec.refedCol]: {
            mayFailOp: async ({ execOnRelDocs, updateDoc, snapshot }) => {
              await propagateRefUpdate({
                execOnRelDocs,
                refedDoc: snapshot,
                referCol: colName,
                referField: fieldName,
                spec,
                updateDoc,
              });
            },
          },
        }
      : undefined,
  };
}
