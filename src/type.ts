import { Dictionary, Field_1, Field_2, FieldOf, Schema } from 'kira-core';

import { ReadDocData, ReadDocSnapshot, WriteDocData } from './doc-data';

// utils
export type Either<T, E> =
  | { readonly tag: 'right'; readonly value: T }
  | { readonly tag: 'left'; readonly error: E };

// Doc
export type DocKey = {
  readonly col:
    | {
        readonly type: 'normal';
        readonly name: string;
      }
    | {
        readonly type: 'rel';
        readonly refedCol: string;
        readonly referCol: string;
        readonly referField: string;
      };
  readonly id: string;
};

// Db
export type GetDoc<E> = (key: DocKey) => Promise<Either<ReadDocSnapshot, E>>;
export type MergeDoc<WR> = (key: DocKey, docData: WriteDocData) => Promise<WR>;
export type DeleteDoc<WR> = (key: DocKey) => Promise<WR>;

// Trigger
export type ReadDocChange = {
  readonly id: string;
  readonly before: ReadDocData;
  readonly after: ReadDocData;
};

export type SnapshotOfTriggerType<T extends TriggerType> = T extends 'onCreate'
  ? ReadDocSnapshot
  : T extends 'onDelete'
  ? ReadDocSnapshot
  : T extends 'onUpdate'
  ? ReadDocChange
  : never;

export type DocCommit =
  | { readonly op: 'merge'; readonly data: WriteDocData }
  | { readonly op: 'delete' };

export type TriggerType = 'onCreate' | 'onUpdate' | 'onDelete';

// Schema_1
export type MakeTriggerContext_1<F extends Field_1> = {
  readonly userCol: string;
  readonly colName: string;
  readonly field: F;
  readonly fieldName: string;
  readonly cols: Dictionary<Dictionary<F>>;
};

// Schema_2
export type MakeTriggerContext_2<F extends Field_2> = {
  readonly colName: string;
  readonly field: F;
  readonly fieldName: string;
  readonly cols: Dictionary<Dictionary<F>>;
};

// blackmagics
export type FieldToTrigger<S extends Schema, T extends TriggerType, GDE, WR> = (args: {
  readonly schema: S;
  readonly fieldName: string;
  readonly field: FieldOf<S>;
  readonly colName: string;
}) => ColsAction<T, GDE, WR> | undefined;

export type Trigger<GDE, WR> = {
  readonly onCreate: ColsAction<'onCreate', GDE, WR>;
  readonly onUpdate: ColsAction<'onUpdate', GDE, WR>;
  readonly onDelete: ColsAction<'onDelete', GDE, WR>;
};

export type ColsAction<T extends TriggerType, GDE, WR> = Dictionary<{
  readonly getTransactionCommit?: GetTransactionCommit<T, GDE>;
  readonly mayFailOp?: MayFailOp<T, GDE, WR>;
}>;

export type DataTypeError = {
  readonly errorType: 'invalid_data_type';
};

export type GetTransactionCommit<T extends TriggerType, GDE> = (param: {
  readonly getDoc: GetDoc<GDE>;
  readonly snapshot: SnapshotOfTriggerType<T>;
}) => Promise<Either<TransactionCommit, DataTypeError | GDE>>;

export type TransactionCommit = Dictionary<Dictionary<DocCommit>>;

export type MayFailOp<T extends TriggerType, GDE, WR> = (param: {
  readonly getDoc: GetDoc<GDE>;
  readonly mergeDoc: MergeDoc<WR>;
  readonly deleteDoc: DeleteDoc<WR>;
  readonly snapshot: SnapshotOfTriggerType<T>;
}) => Promise<unknown>;
