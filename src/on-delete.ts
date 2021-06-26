import { CountField, CreationTimeField, ImageField, RefField, StringField } from 'kira-core';

import { ColsAction, DocKey, MakeTriggerContext } from './type';
import { DOC_IDS_FIELD_NAME } from './util';

export function makeOnDeleteCountFieldTrigger<GDE, WR>({
  colName,
  field: { countedCol, groupByRef },
  fieldName,
}: MakeTriggerContext<CountField>): ColsAction<'onDelete', GDE, WR> {
  return {
    [countedCol]: {
      getTransactionCommit: async ({ snapshot: doc }) => {
        const counterDoc = doc.data?.[groupByRef];
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
    },
  };
}

export function makeOnDeleteCreationTimeFieldTrigger<GDE, WR>(
  _: MakeTriggerContext<CreationTimeField>
): ColsAction<'onDelete', GDE, WR> {
  return {};
}

export function makeOnDeleteImageFieldTrigger<GDE, WR>(
  _: MakeTriggerContext<ImageField>
): ColsAction<'onDelete', GDE, WR> {
  return {};
}

export function makeOnDeleteOwnerFieldTrigger<GDE, WR>({
  colName,
  fieldName,
  field,
}: MakeTriggerContext<RefField>): ColsAction<'onDelete', GDE, WR> {
  return {
    [field.refedCol]: {
      mayFailOp: async ({ getDoc, deleteDoc, snapshot: refedDoc }) => {
        const relDocKey: DocKey = {
          id: refedDoc.id,
          col: {
            type: 'rel',
            referField: fieldName,
            referCol: colName,
            refedCol: field.refedCol,
          },
        };
        const relDoc = await getDoc(relDocKey);

        if (relDoc.tag === 'left') {
          return;
        }

        const referDocIds = relDoc.value.data[DOC_IDS_FIELD_NAME];
        if (referDocIds?.type !== 'stringArray') {
          return;
        }

        deleteDoc(relDocKey);

        referDocIds.value.forEach((referDocId) =>
          deleteDoc({
            id: referDocId,
            col: { type: 'normal', name: colName },
          })
        );
        return;
      },
    },
  };
}

export function makeOnDeleteStringFieldTrigger<GDE, WR>(
  _: MakeTriggerContext<StringField>
): ColsAction<'onDelete', GDE, WR> {
  return {};
}
