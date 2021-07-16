import { Dictionary, Field } from 'kira-core';

// utils
export type Either<V, E> =
  | { readonly tag: 'right'; readonly value: V }
  | { readonly tag: 'left'; readonly error: E };

export type DocKey = {
  readonly col: string;
  readonly id: string;
};

export type RelKey = {
  readonly refedId: string;
  readonly refedCol: string;
  readonly referField: string;
  readonly referCol: string;
};

export type ReadDocSnapshot = {
  readonly id: string;
  readonly data: ReadDocData;
};

/**
 * DocData
 */
export type ReadDocData = Dictionary<ReadField>;

export type WriteDocData = Dictionary<WriteField>;

/**
 * Field
 */
export type ReadWriteField =
  | StringPrimitiveField
  | NumberPrimitiveField
  | DatePrimitiveField
  | StringArrayReadField;

export type ReadField = ReadWriteField | RefReadField;

export type WriteField =
  | ReadWriteField
  | CreationTimeWriteField
  | IncrementWriteField
  | StringArrayUnionWriteField
  | StringArrayRemoveWriteField
  | RefWriteField;

/**
 * Primitive Fields
 */
export type StringPrimitiveField = {
  readonly type: 'string';
  readonly value: string;
};

export type NumberPrimitiveField = {
  readonly type: 'number';
  readonly value: number;
};

export type DatePrimitiveField = {
  readonly type: 'date';
  readonly value: Date;
};

/**
 * ReadFields
 */
export type RefReadField = {
  readonly type: 'ref';
  readonly value: ReadDocSnapshot;
};

export type StringArrayReadField = {
  readonly type: 'stringArray';
  readonly value: readonly string[];
};

/**
 * WriteFields
 */
export type RefWriteField = {
  readonly type: 'ref';
  readonly value: WriteDocData;
};

export type CreationTimeWriteField = {
  readonly type: 'creationTime';
};

export type IncrementWriteField = {
  readonly type: 'increment';
  readonly value: number;
};

export type StringArrayUnionWriteField = {
  readonly type: 'stringArrayUnion';
  readonly value: string;
};

export type StringArrayRemoveWriteField = {
  readonly type: 'stringArrayRemove';
  readonly value: string;
};

// DB
export type DB<GDE, WR> = {
  readonly getDoc: GetDoc<GDE>;
  readonly updateDoc: UpdateDoc<WR>;
  readonly deleteDoc: DeleteDoc<WR>;
};

export type GetDoc<E> = (param: { readonly key: DocKey }) => Promise<Either<ReadDocSnapshot, E>>;

export type UpdateDoc<WR> = (param: {
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
export type TransactionCommit = Dictionary<ColTransactionCommit>;
export type ColTransactionCommit = Dictionary<DocCommit>;

export type DocCommit =
  | {
      readonly op: 'update';
      readonly data: WriteDocData;
      readonly onDocAbsent: 'createDoc' | 'doNotUpdate';
    }
  | { readonly op: 'delete' };

export type MayFailOp<A extends ActionType, GDE, WR> = (param: {
  readonly getDoc: GetDoc<GDE>;
  readonly updateDoc: UpdateDoc<WR>;
  readonly deleteDoc: DeleteDoc<WR>;
  readonly snapshot: SnapshotOfActionType<A>;
}) => Promise<void>;

// Errors
export type KiraError = DataTypeError | TransactionCommitError;
export type DataTypeError = {
  readonly errorType: 'invalid_data_type';
};

export type TransactionCommitError = {
  readonly errorType: 'transaction_commit';
};

export type GetTransactionCommit<A extends ActionType, GDE> = (param: {
  readonly getDoc: GetDoc<GDE>;
  readonly snapshot: SnapshotOfActionType<A>;
}) => Promise<Either<TransactionCommit, DataTypeError | GDE>>;

export type MakeDraft<F extends Field, GDE, WR> = (param: {
  readonly colName: string;
  readonly fieldName: string;
  readonly fieldSpec: F;
}) => Draft<GDE, WR>;
