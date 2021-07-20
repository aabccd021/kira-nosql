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
  RelKey,
  UpdateDoc,
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
  if (field.type === 'ref') {
    return [
      fieldName,
      {
        type: 'ref',
        value: toWriteDoc(field.value.data),
      },
    ];
  }
  if (
    field.type === 'date' ||
    field.type === 'number' ||
    field.type === 'string' ||
    field.type === 'stringArray' ||
    field.type === 'image'
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
      if (diffField.type === 'ref') {
        const data = filterSyncedFields({ data: diffField.value.data, syncedFields: field });
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

function isEqualReadDocField({
  beforeField,
  afterField,
}: {
  readonly beforeField?: Field;
  readonly afterField: Field;
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
  if (afterField.type === 'image') {
    return beforeField?.type === 'image' && beforeField.value.url === afterField.value.url;
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

function relToDocId({ referCol, referField, refedCol, refedId }: RelKey): string {
  return `${referCol}_${referField}_${refedCol}_${refedId}`;
}

function relToDocKey(key: RelKey): DocKey {
  return { col: REL_COL, id: relToDocId(key) };
}

async function getRel({
  key,
  getDoc,
}: {
  readonly key: RelKey;
  readonly getDoc: GetDoc;
}): Promise<Either<readonly string[], GetRelError>> {
  const relDoc = await getDoc({ key: relToDocKey(key) });

  if (relDoc.tag === 'left') {
    return relDoc;
  }

  const referDocIds = relDoc.value[DOC_IDS_FIELD_NAME];
  if (referDocIds?.type !== 'stringArray') {
    return {
      tag: 'left',
      error: { type: 'InvalidFieldTypeError' },
    };
  }
  return { tag: 'right', value: referDocIds.value };
}

async function propagateRefUpdate({
  getDoc,
  updateDoc,
  refedDoc,
  referField,
  referCol,
  spec: { syncedFields, refedCol, thisColRefers },
}: {
  readonly getDoc: GetDoc;
  readonly updateDoc: UpdateDoc;
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
    getDoc,
    key: {
      refedId: refedDoc.id,
      refedCol,
      referField,
      referCol,
    },
  });

  if (referDocIds.tag === 'left') {
    return;
  }

  referDocIds.value.forEach((referDocId) => {
    updateDoc({
      key: { col: referCol, id: referDocId },
      docData: {
        [referField]: {
          type: 'ref',
          value: toWriteDoc(syncData),
        },
      },
    });
    thisColRefers.forEach((thisColRefer) => {
      thisColRefer.fields.forEach((thisColReferField) => {
        propagateRefUpdate({
          getDoc,
          updateDoc,
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
              [referField]: {
                type: 'ref',
                value: {
                  id: refedDoc.id,
                  data: syncData,
                },
              },
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
            getTransactionCommit: async ({ getDoc, snapshot }) => {
              const refField = snapshot.data?.[fieldName];
              if (refField?.type !== 'ref') {
                return { tag: 'left', error: { type: 'InvalidFieldTypeError' } };
              }

              const refDoc = await getDoc({
                key: { col: spec.refedCol, id: refField.value.id },
              });
              if (refDoc.tag === 'left') return refDoc;

              const syncedFieldNames = Object.keys(spec.syncedFields);
              return {
                tag: 'right',
                value: {
                  [colName]: {
                    [snapshot.id]: {
                      op: 'update',
                      onDocAbsent: 'doNotUpdate',
                      data: {
                        [fieldName]: {
                          type: 'ref',
                          value: Object.fromEntries(
                            Object.entries(refDoc.value)
                              .filter(([fieldName]) => syncedFieldNames.includes(fieldName))
                              .map(readToWriteField)
                          ),
                        },
                      },
                    },
                  },
                  [REL_COL]: {
                    [relToDocId({
                      refedId: refField.value.id,
                      refedCol: spec.refedCol,
                      referCol: colName,
                      referField: fieldName,
                    })]: {
                      op: 'update',
                      onDocAbsent: 'createDoc',
                      data: {
                        [DOC_IDS_FIELD_NAME]: {
                          type: 'stringArrayUnion',
                          value: snapshot.id,
                        },
                      },
                    },
                  },
                },
              };
            },
          },
        }
      : undefined,
    onUpdate: needSync
      ? {
          [spec.refedCol]: {
            mayFailOp: async ({ getDoc, updateDoc, snapshot }) => {
              await propagateRefUpdate({
                getDoc,
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
      [colName]: {
        getTransactionCommit: async ({ snapshot }) => {
          const refField = snapshot.data?.[fieldName];
          if (refField?.type !== 'ref') {
            return { tag: 'left', error: { type: 'InvalidFieldTypeError' } };
          }
          return {
            tag: 'right',
            value: {
              [REL_COL]: {
                [relToDocId({
                  refedId: refField.value.id,
                  refedCol: spec.refedCol,
                  referCol: colName,
                  referField: fieldName,
                })]: {
                  op: 'update',
                  onDocAbsent: 'doNotUpdate',
                  data: {
                    [DOC_IDS_FIELD_NAME]: {
                      type: 'stringArrayRemove',
                      value: snapshot.id,
                    },
                  },
                },
              },
            },
          };
        },
      },
      [spec.refedCol]: {
        mayFailOp: async ({ getDoc, deleteDoc, snapshot: refed }) => {
          const key = {
            refedId: refed.id,
            referField: fieldName,
            referCol: colName,
            refedCol: spec.refedCol,
          };

          const referDocIds = await getRel({ getDoc, key });
          if (referDocIds.tag === 'left') {
            return;
          }

          deleteDoc({ key: relToDocKey(key) });

          referDocIds.value.forEach((referDocId) =>
            deleteDoc({ key: { id: referDocId, col: colName } })
          );
        },
      },
    },
  };
}
