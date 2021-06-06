import {
  CountField,
  CreationTimeField,
  ImageField,
  OwnerField,
  RefField,
  StringField,
} from 'kira-core';

import { DocOp, MakeTriggerContext_1, MakeTriggerContext_2, Trigger } from './type';
import { getReadDocDataDiff, readToWriteField } from './util';

export function makeOnUpdateCountFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<CountField>
): Trigger<'onUpdate', GDE, QE> | undefined {
  return undefined;
}

export function makeOnUpdateCreationTimeFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<CreationTimeField>
): Trigger<'onUpdate', GDE, QE> | undefined {
  return undefined;
}

export function makeOnUpdateImageFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<ImageField>
): Trigger<'onUpdate', GDE, QE> | undefined {
  return undefined;
}

export function makeOnUpdateOwnerFieldTrigger<GDE, QE>({
  colName,
  field: { syncFields },
  userCol,
  fieldName,
}: MakeTriggerContext_1<OwnerField>): Trigger<'onUpdate', GDE, QE> | undefined {
  return {
    [userCol]: async ({ queryDoc, snapshot: refDoc }) => {
      if (syncFields === undefined) {
        return { tag: 'right', value: {} };
      }

      const syncFieldNames = Object.keys(syncFields);

      const syncedDataBefore = Object.fromEntries(
        Object.entries(refDoc.before).filter(([fieldName]) => syncFieldNames.includes(fieldName))
      );

      const syncedDataAfter = Object.fromEntries(
        Object.entries(refDoc.after).filter(([fieldName]) => syncFieldNames.includes(fieldName))
      );

      const syncedDataDiff = getReadDocDataDiff({
        before: syncedDataBefore,
        after: syncedDataAfter,
      });

      if (Object.keys(syncedDataDiff).length === 0) {
        return { tag: 'right', value: {} };
      }

      const refererDoc = await queryDoc({
        col: colName,
        where: {
          field: [fieldName, 'id'],
          op: '==',
          value: refDoc.id,
        },
      });

      if (refererDoc.tag === 'left') {
        return refererDoc;
      }

      return {
        tag: 'right',
        value: {
          [colName]: Object.fromEntries(
            refererDoc.value.map<readonly [string, DocOp]>((refererDoc) => [
              refererDoc.id,
              {
                op: 'merge',
                runTrigger: true,
                data: {
                  [fieldName]: {
                    type: 'ref',
                    value: Object.fromEntries(Object.entries(syncedDataDiff).map(readToWriteField)),
                  },
                },
              },
            ])
          ),
        },
      };
    },
  };
}

export function makeOnUpdateRefFieldTrigger<GDE, QE>({
  colName,
  field: { syncFields, refCol },
  fieldName,
}: MakeTriggerContext_2<RefField>): Trigger<'onUpdate', GDE, QE> | undefined {
  return {
    [refCol]: async ({ queryDoc, snapshot: refDoc }) => {
      if (syncFields === undefined) {
        return { tag: 'right', value: {} };
      }

      const syncFieldNames = Object.keys(syncFields);

      const syncedDataBefore = Object.fromEntries(
        Object.entries(refDoc.before).filter(([fieldName]) => syncFieldNames.includes(fieldName))
      );

      const syncedDataAfter = Object.fromEntries(
        Object.entries(refDoc.after).filter(([fieldName]) => syncFieldNames.includes(fieldName))
      );

      const syncedDataDiff = getReadDocDataDiff({
        before: syncedDataBefore,
        after: syncedDataAfter,
      });

      if (Object.keys(syncedDataDiff).length === 0) {
        return { tag: 'right', value: {} };
      }

      const refererDoc = await queryDoc({
        col: colName,
        where: {
          field: [fieldName, 'id'],
          op: '==',
          value: refDoc.id,
        },
      });

      if (refererDoc.tag === 'left') {
        return refererDoc;
      }

      return {
        tag: 'right',
        value: {
          [colName]: Object.fromEntries(
            refererDoc.value.map<readonly [string, DocOp]>((refererDoc) => [
              refererDoc.id,
              {
                op: 'merge',
                runTrigger: true,
                data: {
                  [fieldName]: {
                    type: 'ref',
                    value: Object.fromEntries(Object.entries(syncedDataDiff).map(readToWriteField)),
                  },
                },
              },
            ])
          ),
        },
      };
    },
  };
}

export function makeOnUpdateStringFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<StringField>
): Trigger<'onUpdate', GDE, QE> | undefined {
  return undefined;
}
