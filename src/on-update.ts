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
  DocKey,
  Either,
  GetDoc,
  MakeTriggerContext_1,
  MakeTriggerContext_2,
  MergeDoc,
  ReadDocChange,
} from './type';
import { DOC_IDS_FIELD_NAME, getReadDocDataDiff, readToWriteField } from './util';

export function makeOnUpdateCountFieldTrigger<GDE, WR>(
  _: MakeTriggerContext_2<CountField>
): ColsAction<'onUpdate', GDE, WR> {
  return {};
}

export function makeOnUpdateCreationTimeFieldTrigger<GDE, WR>(
  _: MakeTriggerContext_2<CreationTimeField>
): ColsAction<'onUpdate', GDE, WR> {
  return {};
}

export function makeOnUpdateImageFieldTrigger<GDE, WR>(
  _: MakeTriggerContext_2<ImageField>
): ColsAction<'onUpdate', GDE, WR> {
  return {};
}

async function recursiveUpdateReferDoc<GDE, WR, F extends Field_1>({
  cols,
  mergeDoc,
  getDoc,
  refedCol,
  refedDoc,
  referCol,
  referField,
  syncFields,
}: {
  readonly cols: Dictionary<Dictionary<F>>;
  readonly mergeDoc: MergeDoc<WR>;
  readonly getDoc: GetDoc<GDE>;
  readonly refedCol: string;
  readonly refedDoc: ReadDocChange;
  readonly referCol: string;
  readonly referField: string;
  readonly syncFields: Dictionary<true>;
}): Promise<Either<unknown, GDE | DataTypeError>> {
  if (syncFields === undefined) {
    return { tag: 'right', value: {} };
  }

  const syncFieldNames = Object.keys(syncFields);

  const syncedDataBefore = Object.fromEntries(
    Object.entries(refedDoc.before).filter(([fieldName]) => syncFieldNames.includes(fieldName))
  );

  const syncedDataAfter = Object.fromEntries(
    Object.entries(refedDoc.after).filter(([fieldName]) => syncFieldNames.includes(fieldName))
  );

  const syncedDataDiff = getReadDocDataDiff({
    before: syncedDataBefore,
    after: syncedDataAfter,
  });

  if (Object.keys(syncedDataDiff).length === 0) {
    return { tag: 'right', value: {} };
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
        const referDocKey: DocKey = { col: { type: 'normal', name: referCol }, id: referDocId };
        await mergeDoc(referDocKey, {
          [referField]: {
            type: 'ref',
            value: Object.fromEntries(Object.entries(syncedDataDiff).map(readToWriteField)),
          },
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
                  await recursiveUpdateReferDoc({
                    cols,
                    getDoc,
                    mergeDoc,
                    refedDoc: {
                      id: referDocId,
                      before: {},
                      after: syncedDataDiff,
                    },
                    refedCol: referCol,
                    referCol: colName,
                    referField: fieldName,
                    syncFields: fieldDef.syncFields ?? {},
                  });
                }
              })
            )
        );
      })
    ),
  };
}

export function makeOnUpdateOwnerFieldTrigger<GDE, WR>({
  cols,
  colName,
  field: { syncFields },
  userCol,
  fieldName,
}: MakeTriggerContext_1<OwnerField>): ColsAction<'onUpdate', GDE, WR> {
  return {
    [userCol]: {
      mayFailOp: async ({ getDoc, mergeDoc, snapshot: refedDoc }) =>
        recursiveUpdateReferDoc({
          cols,
          mergeDoc,
          getDoc,
          refedCol: userCol,
          refedDoc: refedDoc,
          referCol: colName,
          referField: fieldName,
          syncFields: syncFields ?? {},
        }),
    },
  };
}

export function makeOnUpdateRefFieldTrigger<GDE, WR>({
  cols,
  colName,
  field: { syncFields, refCol: refedCol },
  fieldName,
}: MakeTriggerContext_2<RefField>): ColsAction<'onUpdate', GDE, WR> {
  return {
    [refedCol]: {
      mayFailOp: async ({ getDoc, mergeDoc, snapshot: refedDoc }) =>
        recursiveUpdateReferDoc({
          cols,
          mergeDoc,
          getDoc,
          refedCol: refedCol,
          refedDoc: refedDoc,
          referCol: colName,
          referField: fieldName,
          syncFields: syncFields ?? {},
        }),
    },
  };
}

export function makeOnUpdateStringFieldTrigger<GDE, WR>(
  _: MakeTriggerContext_2<StringField>
): ColsAction<'onUpdate', GDE, WR> {
  return {};
}
