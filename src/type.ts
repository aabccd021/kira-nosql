import { Dictionary, FieldSpec } from 'kira-core';

// utils
export type Either<V, E> = Right<V> | Left<E>;

export type Right<V> = { readonly tag: 'right'; readonly value: V };
export type Left<E> = { readonly tag: 'left'; readonly error: E };

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

export type DocSnapshot = {
  readonly id: string;
  readonly data: Doc;
};

/**
 * DocData
 */
export type Doc = Dictionary<Field>;

export type WriteDoc = Dictionary<WriteField>;

/**
 * Field
 */
export type ReadWriteField = StringField | NumberField | DateField | StringArrayField | ImageField;

export type Field = ReadWriteField | RefReadField;

export type WriteField =
  | ReadWriteField
  | CreationTimeField
  | IncrementField
  | StringArrayUnionField
  | StringArrayRemoveField
  | RefWriteField;

/**
 * Primitive Fields
 */
export type StringField = {
  readonly type: 'string';
  readonly value: string;
};

export type NumberField = {
  readonly type: 'number';
  readonly value: number;
};

export type DateField = {
  readonly type: 'date';
  readonly value: Date;
};

/**
 * ReadFields
 */
export type RefReadField = {
  readonly type: 'ref';
  readonly value: DocSnapshot;
};

export type StringArrayField = {
  readonly type: 'stringArray';
  readonly value: readonly string[];
};

export type ImageField = {
  readonly type: 'image';
  readonly value: {
    readonly url: string;
  };
};

/**
 * WriteFields
 */
export type RefWriteField = {
  readonly type: 'ref';
  readonly value: WriteDoc;
};

export type CreationTimeField = {
  readonly type: 'creationTime';
};

export type IncrementField = {
  readonly type: 'increment';
  readonly value: number;
};

export type StringArrayUnionField = {
  readonly type: 'stringArrayUnion';
  readonly value: string;
};

export type StringArrayRemoveField = {
  readonly type: 'stringArrayRemove';
  readonly value: string;
};

// DB
export type DBWriteResult = { readonly isSuccess: boolean };

export type DB = {
  readonly getDoc: GetDoc;
  readonly updateDoc: UpdateDoc;
  readonly deleteDoc: DeleteDoc;
};

export type GetDoc = (key: DocKey) => Promise<Either<Doc, GetDocError>>;

export type UpdateDoc = (param: {
  readonly key: DocKey;
  readonly docData: WriteDoc;
}) => Promise<DBWriteResult>;

export type DeleteDoc = (key: DocKey) => Promise<DBWriteResult>;

// Trigger
export type DraftMakerContext = {
  readonly colName: string;
  readonly fieldName: string;
};

export type DraftError = { readonly type: 'DraftError' };

export type Draft = {
  readonly onCreate?: ActionDraft<DocSnapshot>;
  readonly onUpdate?: ActionDraft<DocChange>;
  readonly onDelete?: ActionDraft<DocSnapshot>;
};

export type ActionDraft<S extends Snapshot> = Dictionary<ColDraft<S>>;

export type ColDraft<S extends Snapshot> = {
  readonly getTransactionCommit?: DraftGetTransactionCommit<S>;
  readonly mayFailOp?: MayFailOp<S>;
};

export type Trigger = Dictionary<ColTrigger>;

export type ColTrigger = {
  readonly onCreate?: ActionTrigger<DocSnapshot>;
  readonly onUpdate?: ActionTrigger<DocChange>;
  readonly onDelete?: ActionTrigger<DocSnapshot>;
};

export type ActionTrigger<S extends Snapshot> = {
  readonly getTransactionCommits: readonly DraftGetTransactionCommit<S>[];
  readonly mayFailOps: readonly MayFailOp<S>[];
};

// Draft Content
export type TransactionCommit = Dictionary<ColTransactionCommit>;
export type ColTransactionCommit = Dictionary<DocCommit>;

export type DocCommit =
  | {
      readonly op: 'update';
      readonly data: WriteDoc;
      readonly onDocAbsent: 'createDoc' | 'doNotUpdate';
    }
  | { readonly op: 'delete' };

export type Snapshot = DocSnapshot | DocChange;

export type DocChange = {
  readonly id: string;
  readonly before: Doc;
  readonly after: Doc;
};

export type MayFailOp<S extends Snapshot> = (param: {
  readonly db: {
    readonly getDoc: GetDoc;
    readonly updateDoc: UpdateDoc;
    readonly deleteDoc: DeleteDoc;
  };
  readonly snapshot: S;
}) => Promise<void>;

export type DraftGetTransactionCommit<S extends Snapshot> = (param: {
  readonly db: {
    readonly getDoc: GetDoc;
  };
  readonly snapshot: S;
}) => Promise<Either<TransactionCommit, DraftGetTransactionCommitError>>;

export type SpecToDraft = (param: {
  readonly colName: string;
  readonly fieldName: string;
  readonly spec: FieldSpec;
}) => Draft;

// Errors
export type InvalidFieldTypeError = { readonly type: 'InvalidFieldTypeError' };

export type GetDocError = { readonly type: 'GetDocError' };

export type IncompatibleDocOpError = { readonly type: 'IncompatibleDocOpError' };

export type DraftGetTransactionCommitError = GetDocError | InvalidFieldTypeError;

export type GetTransactionCommitError = IncompatibleDocOpError | DraftGetTransactionCommitError;

export type GetRelError = InvalidFieldTypeError | GetDocError;
