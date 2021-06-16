import {
  CountField,
  CreationTimeField,
  Dictionary,
  Field_1,
  ImageField,
  OwnerField,
  RefField,
  StringField,
} from 'kira-core';

import {
  ColsAction,
  DataTypeError,
  DeleteDoc,
  Either,
  GetDoc,
  MakeTriggerContext_1,
  MakeTriggerContext_2,
} from './type';
import { DOC_IDS_FIELD_NAME } from './util';

export function makeOnDeleteCountFieldTrigger<GDE, WR>({
  colName,
  field: { countedCol, groupByRef },
  fieldName,
}: MakeTriggerContext_2<CountField>): ColsAction<'onDelete', GDE, WR> {
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
  _: MakeTriggerContext_2<CreationTimeField>
): ColsAction<'onDelete', GDE, WR> {
  return {};
}

export function makeOnDeleteImageFieldTrigger<GDE, WR>(
  _: MakeTriggerContext_2<ImageField>
): ColsAction<'onDelete', GDE, WR> {
  return {};
}

async function recursiveDeleteReferDoc<GDE, WR, F extends Field_1>({
  cols,
  deleteDoc,
  getDoc,
  refedCol,
  refedDocId,
  referCol,
  referField,
}: {
  readonly cols: Dictionary<Dictionary<F>>;
  readonly deleteDoc: DeleteDoc<WR>;
  readonly getDoc: GetDoc<GDE>;
  readonly refedCol: string;
  readonly refedDocId: string;
  readonly referCol: string;
  readonly referField: string;
}): Promise<Either<unknown, GDE | DataTypeError>> {
  const relDoc = await getDoc({
    id: refedDocId,
    col: {
      type: 'rel',
      refedCol,
      referField,
      referCol,
    },
  });

  if (relDoc.tag === 'left') {
    return relDoc;
  }

  const referDocIds = relDoc.value.data[DOC_IDS_FIELD_NAME];
  if (referDocIds?.type !== 'stringArray') {
    return {
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    };
  }

  return {
    tag: 'right',
    value: Promise.all(
      referDocIds.value.map(async (referDocId) => {
        await deleteDoc({
          id: referDocId,
          col: { type: 'normal', name: referCol },
        });
        await Promise.all(
          Object.entries(cols)
            // Filter self column name (to avoid self infinite loop, just in case), and refed col
            // name (to avoid 2 collections circular infinite loop). This won't prevent 3
            // collections circular infinite loop.
            .filter(([colName]) => colName !== referCol && colName !== refedCol)
            .map(async ([colName, col]) =>
              Object.entries(col).map(async ([fieldName, fieldDef]) => {
                if (fieldDef.type === 'ref' && fieldDef.refCol === referCol) {
                  await recursiveDeleteReferDoc({
                    cols,
                    getDoc,
                    deleteDoc,
                    refedCol: referCol,
                    refedDocId: referDocId,
                    referCol: colName,
                    referField: fieldName,
                  });
                }
              })
            )
        );
      })
    ),
  };
}

export function makeOnDeleteOwnerFieldTrigger<GDE, WR>({
  colName,
  fieldName,
  userCol,
  cols,
}: MakeTriggerContext_1<OwnerField>): ColsAction<'onDelete', GDE, WR> {
  return {
    [userCol]: {
      mayFailOp: async ({ getDoc, deleteDoc, snapshot: refedDoc }) =>
        recursiveDeleteReferDoc({
          cols,
          getDoc,
          deleteDoc,
          refedCol: userCol,
          refedDocId: refedDoc.id,
          referCol: colName,
          referField: fieldName,
        }),
    },
  };
}

export function makeOnDeleteRefFieldTrigger<GDE, WR>({
  cols,
  colName,
  fieldName,
  field: { refCol: refedCol },
}: MakeTriggerContext_2<RefField>): ColsAction<'onDelete', GDE, WR> {
  return {
    [refedCol]: {
      mayFailOp: async ({ getDoc, deleteDoc, snapshot: refedDoc }) =>
        recursiveDeleteReferDoc({
          cols,
          getDoc,
          deleteDoc,
          refedCol,
          refedDocId: refedDoc.id,
          referCol: colName,
          referField: fieldName,
        }),
    },
  };
}

export function makeOnDeleteStringFieldTrigger<GDE, WR>(
  _: MakeTriggerContext_2<StringField>
): ColsAction<'onDelete', GDE, WR> {
  return {};
}
