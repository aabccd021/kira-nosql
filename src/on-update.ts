import {
  CountField,
  CreationTimeField,
  ImageField,
  OwnerField,
  RefField,
  StringField,
} from 'kira-core';

import { MakeTriggerContext_1, MakeTriggerContext_2, Trigger } from '.';
import { DocOp } from './type';
import { readToWriteField, writeDocDataIsEqual } from './util';

export function makeOnCreateCountFieldTrigger<GDE, QE>(
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

      const syncedDataBefore = Object.fromEntries(
        Object.entries(refDoc.before ?? {})
          .filter(([fieldName]) => syncFieldNames.includes(fieldName))
          .map(readToWriteField)
      );

      const syncedDataAfter = Object.fromEntries(
        Object.entries(refDoc.before ?? {})
          .filter(([fieldName]) => syncFieldNames.includes(fieldName))
          .map(readToWriteField)
      );

      if (writeDocDataIsEqual(syncedDataBefore, syncedDataAfter)) {
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

      const syncFieldNames = Object.keys(syncFields);
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
                    value: syncedDataAfter,
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

      const syncedDataBefore = Object.fromEntries(
        Object.entries(refDoc.before ?? {})
          .filter(([fieldName]) => syncFieldNames.includes(fieldName))
          .map(readToWriteField)
      );

      const syncedDataAfter = Object.fromEntries(
        Object.entries(refDoc.before ?? {})
          .filter(([fieldName]) => syncFieldNames.includes(fieldName))
          .map(readToWriteField)
      );

      if (writeDocDataIsEqual(syncedDataBefore, syncedDataAfter)) {
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

      const syncFieldNames = Object.keys(syncFields);
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
                    value: syncedDataAfter,
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

export function makeOnCreateStringFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<StringField>
): Trigger<'onCreate', GDE, QE> | undefined {
  return undefined;
}
