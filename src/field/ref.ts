import {
  ColRefer,
  Field,
  filterSyncedFields,
  isFieldEqual,
  RefField,
  RefFieldSpec,
  RefUpdateField,
  SyncedFields,
} from 'kira-core';
import { eitherMapRight, Left, None, optionFromNullable, optionMapSome, Right, Some } from 'trimop';

import {
  DocChange,
  Draft,
  DraftBuilderContext,
  ExecOnRelDocs,
  InvalidFieldTypeError,
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
  return eitherMapRight(
    filterSyncedFields({
      doc: Object.fromEntries(
        Object.entries(refedDoc.after).filter(
          ([fieldName, afterField]) =>
            !isFieldEqual(afterField, optionFromNullable<Field>(refedDoc.before[fieldName]))
        )
      ),
      syncedFields,
    }),
    (syncData) =>
      Right(
        optionMapSome(syncData, (syncData) =>
          Some(
            execOnRelDocs(
              {
                refedCol,
                refedId: refedDoc.id,
                referCol,
                referField,
              },
              (id) =>
                Promise.all([
                  updateDoc({
                    key: { col: referCol, id },
                    writeDoc: {
                      [referField]: RefUpdateField(syncData),
                    },
                  }),
                  ...thisColRefers.flatMap((thisColRefer) =>
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
                  ),
                ])
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
      ? Some({
          [colName]: {
            getTransactionCommit: Some(async ({ getDoc, snapshot }) => {
              const refField = snapshot.doc[fieldName];

              return refField?._type !== 'Ref'
                ? Left(
                    InvalidFieldTypeError({
                      doc: snapshot.doc,
                      fieldName,
                    })
                  )
                : eitherMapRight(
                    await getDoc({ col: spec.refedCol, id: refField.snapshot.id }),
                    (refedDoc) => {
                      const syncedFieldNames = Object.keys(spec.syncedFields);
                      return Right({
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
            }),
            propagationOp: None(),
          },
        })
      : None(),
    onDelete: Some({
      [spec.refedCol]: {
        getTransactionCommit: None(),
        propagationOp: Some(({ execOnRelDocs, deleteDoc, snapshot: refed }) =>
          execOnRelDocs(
            {
              refedCol: spec.refedCol,
              refedId: refed.id,
              referCol: colName,
              referField: fieldName,
            },
            (id) => deleteDoc({ col: colName, id })
          )
        ),
      },
    }),
    onUpdate: needSync
      ? Some({
          [spec.refedCol]: {
            getTransactionCommit: None(),
            propagationOp: Some(({ execOnRelDocs, updateDoc, snapshot }) =>
              propagateRefUpdate({
                execOnRelDocs,
                refedDoc: snapshot,
                referCol: colName,
                referField: fieldName,
                spec,
                updateDoc,
              })
            ),
          },
        })
      : None(),
  };
}
