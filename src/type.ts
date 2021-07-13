import { Dictionary, Field } from 'kira-core';

import { ReadDocData, ReadDocSnapshot, WriteDocData } from './data';

// utils
export type Either<V, E> =
  | { readonly tag: 'right'; readonly value: V }
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

// DB
export type DB<GDE, WR> = {
  readonly getDoc: GetDoc<GDE>;
  readonly mergeDoc: MergeDoc<WR>;
  readonly deleteDoc: DeleteDoc<WR>;
};

export type GetDoc<E> = (param: { readonly key: DocKey }) => Promise<Either<ReadDocSnapshot, E>>;

export type MergeDoc<WR> = (param: {
  readonly key: DocKey;
  readonly docData: WriteDocData;
}) => Promise<WR>;

export type DeleteDoc<WR> = (param: { readonly key: DocKey }) => Promise<WR>;

// Trigger
export type ReadDocChange = {
  readonly id: string;
  readonly before: ReadDocData;
  readonly after: ReadDocData;
};

export type SnapshotOfActionType<A extends ActionType> = A extends 'onCreate'
  ? ReadDocSnapshot
  : A extends 'onDelete'
  ? ReadDocSnapshot
  : A extends 'onUpdate'
  ? ReadDocChange
  : never;

export const ACTION_TYPE = ['onCreate', 'onUpdate', 'onDelete'] as const;
export type ActionType = typeof ACTION_TYPE[number];

export type DraftMakerContext<F extends Field> = {
  readonly colName: string;
  readonly fieldSpec: F;
  readonly fieldName: string;
};

export type Draft<GDE, WR> = {
  readonly [A in ActionType]?: ActionDraft<A, GDE, WR>;
};

export type ActionDraft<A extends ActionType, GDE, WR> = Dictionary<ColDraft<A, GDE, WR>>;

export type ColDraft<A extends ActionType, GDE, WR> = {
  readonly getTransactionCommit?: GetTransactionCommit<A, GDE>;
  readonly mayFailOp?: MayFailOp<A, GDE, WR>;
};

export type ColDrafts<A extends ActionType, GDE, WR> = {
  readonly getTransactionCommits: readonly GetTransactionCommit<A, GDE>[];
  readonly mayFailOps: readonly MayFailOp<A, GDE, WR>[];
};

// Draft Content
export type TransactionCommit = Dictionary<Dictionary<DocCommit>>;

export type DocCommit =
  | { readonly op: 'merge'; readonly data: WriteDocData }
  | { readonly op: 'delete' };

export type MayFailOp<A extends ActionType, GDE, WR> = (param: {
  readonly getDoc: GetDoc<GDE>;
  readonly mergeDoc: MergeDoc<WR>;
  readonly deleteDoc: DeleteDoc<WR>;
  readonly snapshot: SnapshotOfActionType<A>;
}) => Promise<void>;

// etc
export type DataTypeError = {
  readonly errorType: 'invalid_data_type';
};

export type GetTransactionCommit<A extends ActionType, GDE> = (param: {
  readonly getDoc: GetDoc<GDE>;
  readonly snapshot: SnapshotOfActionType<A>;
}) => Promise<Either<TransactionCommit, DataTypeError | GDE>>;

export type MakeTrigger<F extends Field, GDE, WR> = (param: {
  readonly colName: string;
  readonly fieldName: string;
  readonly fieldSpec: F;
}) => Draft<GDE, WR>;
