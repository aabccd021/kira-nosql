import {
  CountField,
  CreationTimeField,
  ImageField,
  OwnerField,
  RefField,
  StringField,
} from 'kira-core';

import { MakeTriggerContext_1, MakeTriggerContext_2, Trigger } from './type';

export function makeOnDeleteCountFieldTrigger<GDE, QE>({
  colName,
  field: { countedCol, groupByRef },
  fieldName,
}: MakeTriggerContext_2<CountField>): Trigger<'onDelete', GDE, QE> | undefined {
  return {
    [countedCol]: async ({ snapshot: document }) => {
      const counterDoc = document.data?.[groupByRef];
      if (counterDoc?.type !== 'ref') {
        return {
          tag: 'left',
          error: { errorType: 'invalid_data_type' },
        };
      }
      return {
        tag: 'right',
        value: {
          [colName]: {
            [counterDoc.value.id]: {
              op: 'merge',
              data: {
                [fieldName]: { type: 'increment', incrementValue: -1 },
              },
            },
          },
        },
      };
    },
  };
}

export function makeOnDeleteCreationTimeFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<CreationTimeField>
): Trigger<'onDelete', GDE, QE> | undefined {
  return undefined;
}

export function makeOnDeleteImageFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<ImageField>
): Trigger<'onDelete', GDE, QE> | undefined {
  return undefined;
}

// TODO: onDeleteCascade, defaults to false
export function makeOnDeleteOwnerFieldTrigger<GDE, QE>({
  colName,
  fieldName,
  userCol,
}: MakeTriggerContext_1<OwnerField>): Trigger<'onDelete', GDE, QE> | undefined {
  return {
    [userCol]: async ({ queryDoc, snapshot: refDoc }) => {
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
            refererDoc.value.map((refererDoc) => [refererDoc.id, { op: 'delete' }])
          ),
        },
      };
    },
  };
}

export function makeOnDeleteRefFieldTrigger<GDE, QE>({
  colName,
  fieldName,
  field: { refCol },
}: MakeTriggerContext_2<RefField>): Trigger<'onDelete', GDE, QE> | undefined {
  return {
    [refCol]: async ({ queryDoc, snapshot: refDoc }) => {
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
            refererDoc.value.map((refererDoc) => [refererDoc.id, { op: 'delete' }])
          ),
        },
      };
    },
  };
}

export function makeOnDeleteStringFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<StringField>
): Trigger<'onDelete', GDE, QE> | undefined {
  return undefined;
}
