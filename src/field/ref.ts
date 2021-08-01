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
  readonly updateDoc: UpdateDoc;
  readonly execOnRelDocs: ExecOnRelDocs;
  readonly refedDoc: DocChange;
  readonly referField: string;
  readonly referCol: string;
  readonly spec: {
    readonly refedCol: string;
    readonly syncedFields: SyncedFields;
    readonly thisColRefers: readonly ColRefer[];
  };
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
        relKey: {
          refedId: refedDoc.id,
          refedCol,
          referField,
          referCol,
        },
        exec: async ({ id }) => {
          await updateDoc({
            key: { col: referCol, id },
            docData: {
              [referField]: RefUpdateField(syncData),
            },
          });

          thisColRefers.forEach((thisColRefer) => {
            thisColRefer.fields.forEach((thisColReferField) => {
              propagateRefUpdate({
                updateDoc,
                execOnRelDocs,
                spec: {
                  refedCol: referCol,
                  syncedFields: thisColReferField.syncedFields,
                  thisColRefers: thisColRefer.thisColRefers,
                },
                referCol: thisColRefer.colName,
                referField: thisColReferField.name,
                refedDoc: {
                  id,
                  before: {},
                  after: {
                    [referField]: RefField({
                      id: refedDoc.id,
                      doc: syncData,
                    }),
                  },
                },
              });
            });
          });
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
                        onDocAbsent: 'doNotUpdate',
                        data: {
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
    onUpdate: needSync
      ? {
          [spec.refedCol]: {
            mayFailOp: async ({ execOnRelDocs, updateDoc, snapshot }) => {
              await propagateRefUpdate({
                execOnRelDocs,
                updateDoc,
                spec,
                refedDoc: snapshot,
                referCol: colName,
                referField: fieldName,
              });
            },
          },
        }
      : undefined,
    onDelete: {
      [spec.refedCol]: {
        mayFailOp: async ({ execOnRelDocs, deleteDoc, snapshot: refed }) =>
          execOnRelDocs({
            relKey: {
              refedId: refed.id,
              referField: fieldName,
              referCol: colName,
              refedCol: spec.refedCol,
            },
            exec: (doc) => deleteDoc({ id: doc.id, col: colName }),
          }),
      },
    },
  };
}
