import {
  CountField,
  CreationTimeField,
  ImageField,
  OwnerField,
  RefField,
  StringField,
} from 'kira-core';

import { MakeTriggerContext_1, MakeTriggerContext_2, Trigger } from './type';

export function makeOnDeleteCountFieldTrigger<GDE>({
  colName,
  field: { countedCol, groupByRef },
  fieldName,
}: MakeTriggerContext_2<CountField>): Trigger<'onCreate', GDE> | undefined {
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

export function makeOnDeleteCreationTimeFieldTrigger<GDE>(
  _: MakeTriggerContext_2<CreationTimeField>
): Trigger<'onCreate', GDE> | undefined {
  return undefined;
}

export function makeOnDeleteImageFieldTrigger<GDE>(
  _: MakeTriggerContext_2<ImageField>
): Trigger<'onCreate', GDE> | undefined {
  return undefined;
}

export function makeOnDeleteOwnerFieldTrigger<GDE>(
  _: MakeTriggerContext_1<OwnerField>
): Trigger<'onCreate', GDE> | undefined {
  return undefined;
}

export function makeOnDeleteRefFieldTrigger<GDE>(
  _: MakeTriggerContext_2<RefField>
): Trigger<'onCreate', GDE> | undefined {
  return undefined;
}

export function makeOnDeleteStringFieldTrigger<GDE>(
  _: MakeTriggerContext_2<StringField>
): Trigger<'onCreate', GDE> | undefined {
  return undefined;
}
