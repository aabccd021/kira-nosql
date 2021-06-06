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
}: MakeTriggerContext_2<CountField>): Trigger<'onCreate', GDE, QE> | undefined {
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
): Trigger<'onCreate', GDE, QE> | undefined {
  return undefined;
}

export function makeOnDeleteImageFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<ImageField>
): Trigger<'onCreate', GDE, QE> | undefined {
  return undefined;
}

export function makeOnDeleteOwnerFieldTrigger<GDE, QE>({
  colName,
  fieldName,
  userCol,
}: MakeTriggerContext_1<OwnerField>): Trigger<'onCreate', GDE, QE> | undefined {
  return {
    [userCol]: async ({ queryDoc, snapshot: refDoc }) => {
      const refingDoc = await queryDoc({
        col: colName,
        where: { field: [fieldName, 'id'], op: '==', value: refDoc.id },
      });

      if (refingDoc.tag === 'left') {
        return refingDoc;
      }

      return {
        tag: 'right',
        value: {
          [colName]: Object.fromEntries(
            refingDoc.value.map((refingDoc) => [refingDoc.id, { op: 'delete' }])
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
}: MakeTriggerContext_2<RefField>): Trigger<'onCreate', GDE, QE> | undefined {
  return {
    [refCol]: async ({ queryDoc, snapshot: refDoc }) => {
      const refingDoc = await queryDoc({
        col: colName,
        where: { field: [fieldName, 'id'], op: '==', value: refDoc.id },
      });

      if (refingDoc.tag === 'left') {
        return refingDoc;
      }

      return {
        tag: 'right',
        value: {
          [colName]: Object.fromEntries(
            refingDoc.value.map((refingDoc) => [refingDoc.id, { op: 'delete' }])
          ),
        },
      };
    },
  };
}

export function makeOnDeleteStringFieldTrigger<GDE, QE>(
  _: MakeTriggerContext_2<StringField>
): Trigger<'onCreate', GDE, QE> | undefined {
  return undefined;
}
