import {
  CountField,
  CreationTimeField,
  ImageField,
  RefField,
  StringField,
  SyncFields,
  ThisColRefer,
} from 'kira-core';

import { ColsAction, DocKey, GetDoc, MakeTriggerContext, MergeDoc, ReadDocChange } from './type';
import {
  DOC_IDS_FIELD_NAME,
  filterSyncFields,
  isEqualReadDocField,
  readToWriteField,
} from './util';

export function makeOnUpdateCountFieldTrigger<GDE, WR>(
  _: MakeTriggerContext<CountField>
): ColsAction<'onUpdate', GDE, WR> {
  return {};
}

export function makeOnUpdateCreationTimeFieldTrigger<GDE, WR>(
  _: MakeTriggerContext<CreationTimeField>
): ColsAction<'onUpdate', GDE, WR> {
  return {};
}

export function makeOnUpdateImageFieldTrigger<GDE, WR>(
  _: MakeTriggerContext<ImageField>
): ColsAction<'onUpdate', GDE, WR> {
  return {};
}

async function propagateRefUpdate<GDE, WR>({
  getDoc,
  mergeDoc,
  refedDoc,
  referField,
  referCol,
  field: { syncFields, refedCol, thisColRefers },
}: {
  readonly getDoc: GetDoc<GDE>;
  readonly mergeDoc: MergeDoc<WR>;
  readonly refedDoc: ReadDocChange;
  readonly referField: string;
  readonly referCol: string;
  readonly field: {
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
    id: refedDoc.id,
    col: {
      type: 'rel',
      refedCol,
      referField,
      referCol,
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
    const referDocKey: DocKey = {
      col: { type: 'normal', name: referCol },
      id: referDocId,
    };
    mergeDoc(referDocKey, {
      [referField]: {
        type: 'ref',
        value: Object.fromEntries(Object.entries(syncData).map(readToWriteField)),
      },
    });
    thisColRefers.forEach((thisColRefer) => {
      thisColRefer.fields.forEach((thisColReferField) => {
        propagateRefUpdate({
          getDoc,
          mergeDoc,
          field: {
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

export function makeOnUpdateRefFieldTrigger<GDE, WR>({
  colName,
  field,
  fieldName,
}: MakeTriggerContext<RefField>): ColsAction<'onUpdate', GDE, WR> {
  return {
    [field.refedCol]: {
      mayFailOp: async ({ getDoc, mergeDoc, snapshot }) => {
        propagateRefUpdate({
          getDoc,
          mergeDoc,
          field,
          refedDoc: snapshot,
          referCol: colName,
          referField: fieldName,
        });
      },
    },
  };
}

export function makeOnUpdateStringFieldTrigger<GDE, WR>(
  _: MakeTriggerContext<StringField>
): ColsAction<'onUpdate', GDE, WR> {
  return {};
}
