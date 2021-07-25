import assertNever from 'assert-never';
import { ColRefer, RefFieldSpec, SyncedFields } from 'kira-core';

import {
  Doc,
  DocChange,
  DocKey,
  Draft,
  DraftMakerContext,
  Either,
  Field,
  GetDoc,
  GetRelError,
  InvalidFieldTypeError,
  Left,
  RefField,
  RefWriteField,
  RelKey,
  Right,
  StringArrayRemoveField,
  StringArrayUnionField,
  UpdateDoc,
  UpdateDocCommit,
  WriteDoc,
  WriteField,
} from '../type';

const DOC_IDS_FIELD_NAME = 'docIds';
const REL_COL = '_relation';

function toWriteDoc(doc: Doc): WriteDoc {
  return Object.fromEntries(Object.entries(doc).map(readToWriteField));
}

function readToWriteField([fieldName, field]: readonly [string, Field]): readonly [
  string,
  WriteField
] {
  if (field._type === 'ref') {
    return [fieldName, RefWriteField(toWriteDoc(field.value.data))];
  }
  if (
    field._type === 'date' ||
    field._type === 'number' ||
    field._type === 'string' ||
    field._type === 'stringArray' ||
    field._type === 'image'
  ) {
    return [fieldName, field];
  }
  assertNever(field);
}

function filterSyncedFields({
  data,
  syncedFields,
}: {
  readonly data: Doc;
  readonly syncedFields: SyncedFields;
}): Doc | undefined {
  return Object.entries(syncedFields).reduce<Doc | undefined>((prev, [fieldName, field]) => {
    const diffField = data[fieldName];
    if (diffField !== undefined) {
      if (field === true) {
        return { ...prev, [fieldName]: diffField };
      }
      if (diffField._type === 'ref') {
        const data = filterSyncedFields({ data: diffField.value.data, syncedFields: field });
        if (data !== undefined) {
          return {
            ...prev,
            [fieldName]: RefField({ id: diffField.value.id, data }),
          };
        }
      }
    }
    return prev;
  }, undefined);
}

function isEqualReadDocField({
  beforeField,
  afterField,
}: {
  readonly beforeField?: Field;
  readonly afterField: Field;
}): boolean {
  if (afterField._type === 'date') {
    return (
      beforeField?._type === 'date' && afterField.value.getTime() === beforeField.value.getTime()
    );
  }
  if (afterField._type === 'number') {
    return beforeField?._type === 'number' && afterField.value === beforeField.value;
  }
  if (afterField._type === 'string') {
    return beforeField?._type === 'string' && afterField.value === beforeField.value;
  }
  if (afterField._type === 'stringArray') {
    return (
      beforeField?._type === 'stringArray' &&
      afterField.value.length === beforeField.value.length &&
      afterField.value.every((val, idx) => val === beforeField.value[idx])
    );
  }
  if (afterField._type === 'image') {
    return beforeField?._type === 'image' && beforeField.value.url === afterField.value.url;
  }
  if (afterField._type === 'ref') {
    return (
      beforeField?._type === 'ref' &&
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

function relToDocId({ referCol, referField, refedCol, refedId }: RelKey): string {
  return `${referCol}_${referField}_${refedCol}_${refedId}`;
}

function relToDocKey(key: RelKey): DocKey {
  return { col: REL_COL, id: relToDocId(key) };
}

async function getRel({
  key,
  db,
}: {
  readonly key: RelKey;
  readonly db: {
    readonly getDoc: GetDoc;
  };
}): Promise<Either<GetRelError, readonly string[]>> {
  const docKey = relToDocKey(key);
  const relDoc = await db.getDoc(docKey);

  if (relDoc._tag === 'left') {
    return relDoc;
  }

  const referDocIds = relDoc.value[DOC_IDS_FIELD_NAME];

  if (referDocIds?._type !== 'stringArray') {
    return Left(
      InvalidFieldTypeError({
        colName: docKey.col,
        fieldName: DOC_IDS_FIELD_NAME,
        expectedFieldType: 'stringArray',
        doc: relDoc.value,
      })
    );
  }

  return Right(referDocIds.value);
}

async function propagateRefUpdate({
  db,
  refedDoc,
  referField,
  referCol,
  spec: { syncedFields, refedCol, thisColRefers },
}: {
  readonly db: {
    readonly getDoc: GetDoc;
    readonly updateDoc: UpdateDoc;
  };
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
      ([fieldName, afterField]) =>
        !isEqualReadDocField({ afterField, beforeField: refedDoc.before[fieldName] })
    )
  );

  const syncData = filterSyncedFields({ data: updateDiff, syncedFields });

  if (syncData === undefined) {
    return;
  }

  const referDocIds = await getRel({
    db,
    key: {
      refedId: refedDoc.id,
      refedCol,
      referField,
      referCol,
    },
  });

  if (referDocIds._tag === 'left') {
    return;
  }

  referDocIds.value.forEach((referDocId) => {
    db.updateDoc({
      key: { col: referCol, id: referDocId },
      docData: {
        [referField]: RefWriteField(toWriteDoc(syncData)),
      },
    });

    thisColRefers.forEach((thisColRefer) => {
      thisColRefer.fields.forEach((thisColReferField) => {
        propagateRefUpdate({
          db,
          spec: {
            refedCol: referCol,
            syncedFields: thisColReferField.syncedFields,
            thisColRefers: thisColRefer.thisColRefers,
          },
          referCol: thisColRefer.colName,
          referField: thisColReferField.name,
          refedDoc: {
            id: referDocId,
            before: {},
            after: {
              [referField]: RefField({
                id: refedDoc.id,
                data: syncData,
              }),
            },
          },
        });
      });
    });
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
            getTransactionCommit: async ({ db, snapshot }) => {
              const refField = snapshot.data?.[fieldName];

              if (refField?._type !== 'ref') {
                return Left(
                  InvalidFieldTypeError({
                    colName,
                    fieldName,
                    expectedFieldType: 'ref',
                    doc: snapshot.data,
                  })
                );
              }

              const refedDoc = await db.getDoc({ col: spec.refedCol, id: refField.value.id });

              if (refedDoc._tag === 'left') return refedDoc;

              const syncedFieldNames = Object.keys(spec.syncedFields);
              return Right({
                [colName]: {
                  [snapshot.id]: UpdateDocCommit({
                    onDocAbsent: 'doNotUpdate',
                    data: {
                      [fieldName]: RefWriteField(
                        Object.fromEntries(
                          Object.entries(refedDoc.value)
                            .filter(([fieldName]) => syncedFieldNames.includes(fieldName))
                            .map(readToWriteField)
                        )
                      ),
                    },
                  }),
                },
                [REL_COL]: {
                  [relToDocId({
                    refedId: refField.value.id,
                    refedCol: spec.refedCol,
                    referCol: colName,
                    referField: fieldName,
                  })]: UpdateDocCommit({
                    onDocAbsent: 'createDoc',
                    data: {
                      [DOC_IDS_FIELD_NAME]: StringArrayUnionField(snapshot.id),
                    },
                  }),
                },
              });
            },
          },
        }
      : undefined,
    onUpdate: needSync
      ? {
          [spec.refedCol]: {
            mayFailOp: async ({ db, snapshot }) => {
              await propagateRefUpdate({
                db,
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
      [colName]: {
        getTransactionCommit: async ({ snapshot }) => {
          const refField = snapshot.data?.[fieldName];

          if (refField?._type !== 'ref') {
            return Left(
              InvalidFieldTypeError({
                colName,
                fieldName,
                expectedFieldType: 'ref',
                doc: snapshot.data,
              })
            );
          }

          return Right({
            [REL_COL]: {
              [relToDocId({
                refedId: refField.value.id,
                refedCol: spec.refedCol,
                referCol: colName,
                referField: fieldName,
              })]: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                data: {
                  [DOC_IDS_FIELD_NAME]: StringArrayRemoveField(snapshot.id),
                },
              }),
            },
          });
        },
      },
      [spec.refedCol]: {
        mayFailOp: async ({ db, snapshot: refed }) => {
          const key = {
            refedId: refed.id,
            referField: fieldName,
            referCol: colName,
            refedCol: spec.refedCol,
          };

          const referDocIds = await getRel({ db, key });
          if (referDocIds._tag === 'left') {
            return;
          }

          db.deleteDoc(relToDocKey(key));

          referDocIds.value.forEach((referDocId) => db.deleteDoc({ id: referDocId, col: colName }));
        },
      },
    },
  };
}
