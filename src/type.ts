import { Dictionary, FieldSpec } from 'kira-core';

/**
 *Either
 */
export type Either<E, V> = Left<E> | Right<V>;

export function Right<V>(value: V): Right<V> {
  return { _tag: 'right', value };
}

export type Right<V> = { readonly _tag: 'right'; readonly value: V };

export function Left<V>(error: V): Left<V> {
  return { _tag: 'left', error };
}

export type Left<E> = { readonly _tag: 'left'; readonly error: E };

/**
 *Key
 */
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

/**
 *Snapshot
 */
export type Snapshot = DocSnapshot | DocChange;

export type DocChange = {
  readonly id: string;
  readonly before: Doc;
  readonly after: Doc;
};

export type DocSnapshot = {
  readonly id: string;
  readonly data: Doc;
};

/**
 *Doc
 */
export type Doc = Dictionary<Field>;

export type WriteDoc = Dictionary<WriteField>;

/**
 *Field
 */
export type ReadWriteField = StringField | NumberField | DateField | StringArrayField | ImageField;

export type Field = ReadWriteField | RefField;

export type WriteField =
  | ReadWriteField
  | CreationTimeField
  | IncrementField
  | StringArrayUnionField
  | StringArrayRemoveField
  | RefWriteField;

/**
 *Primitive Fields
 */

/**
 *StringField
 */
export function StringField(value: string): StringField {
  return { _type: 'string', value };
}

export type StringField = {
  readonly _type: 'string';
  readonly value: string;
};

/**
 *NumberField
 */
export function NumberField(value: number): NumberField {
  return { _type: 'number', value };
}

export type NumberField = {
  readonly _type: 'number';
  readonly value: number;
};

/**
 *DateField
 */
export function DateField(value: Date): DateField {
  return { _type: 'date', value };
}

export type DateField = {
  readonly _type: 'date';
  readonly value: Date;
};

/**
 *ReadFields
 */

/**
 *RefReadField
 */
export function RefField(value: DocSnapshot): RefField {
  return { _type: 'ref', value };
}

export type RefField = {
  readonly _type: 'ref';
  readonly value: DocSnapshot;
};

/**
 *StringArrayField
 */
export function StringArrayField(value: readonly string[]): StringArrayField {
  return { _type: 'stringArray', value };
}

export type StringArrayField = {
  readonly _type: 'stringArray';
  readonly value: readonly string[];
};

/**
 *ImageField
 */
export function ImageField(value: ImageFieldValue): ImageField {
  return { _type: 'image', value };
}

export type ImageField = {
  readonly _type: 'image';
  readonly value: ImageFieldValue;
};

export type ImageFieldValue = {
  readonly url: string;
};

/**
 *WriteFields
 */

/**
 *RefWriteField
 */
export function RefWriteField(value: WriteDoc): RefWriteField {
  return { _type: 'ref', value };
}

export type RefWriteField = {
  readonly _type: 'ref';
  readonly value: WriteDoc;
};

/**
 *CreationTimeField
 */
export function CreationTimeField(): CreationTimeField {
  return { _type: 'creationTime' };
}

export type CreationTimeField = {
  readonly _type: 'creationTime';
};

/**
 *CreationTimeField
 */
export function IncrementField(value: number): IncrementField {
  return { _type: 'increment', value };
}

export type IncrementField = {
  readonly _type: 'increment';
  readonly value: number;
};

/**
 *StringArrayUnionField
 */
export function StringArrayUnionField(value: string): StringArrayUnionField {
  return { _type: 'stringArrayUnion', value };
}
export type StringArrayUnionField = {
  readonly _type: 'stringArrayUnion';
  readonly value: string;
};

/**
 *StringArrayRemoveField
 */
export function StringArrayRemoveField(value: string): StringArrayRemoveField {
  return { _type: 'stringArrayRemove', value };
}

export type StringArrayRemoveField = {
  readonly _type: 'stringArrayRemove';
  readonly value: string;
};

/**
 *DB
 */
export type DBWriteResult = { readonly isSuccess: boolean };

export type DB = {
  readonly getDoc: GetDoc;
  readonly updateDoc: UpdateDoc;
  readonly deleteDoc: DeleteDoc;
};

export type GetDoc = (key: DocKey) => Promise<Either<GetDocError, Doc>>;

export type UpdateDoc = (param: {
  readonly key: DocKey;
  readonly docData: WriteDoc;
}) => Promise<DBWriteResult>;

export type DeleteDoc = (key: DocKey) => Promise<DBWriteResult>;

/**
 *Trigger
 */
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

/**
 *Draft
 */
export type DraftMakerContext = {
  readonly colName: string;
  readonly fieldName: string;
};

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

export type DraftGetTransactionCommit<S extends Snapshot> = (param: {
  readonly snapshot: S;
  readonly db: {
    readonly getDoc: GetDoc;
  };
}) => Promise<Either<DraftGetTransactionCommitError, TransactionCommit>>;

export type SpecToDraft = (param: {
  readonly colName: string;
  readonly fieldName: string;
  readonly spec: FieldSpec;
}) => Draft;

/**
 *Commit
 */
export type TransactionCommit = Dictionary<ColTransactionCommit>;

export type ColTransactionCommit = Dictionary<DocCommit>;

export type MayFailOp<S extends Snapshot> = (param: {
  readonly snapshot: S;
  readonly db: {
    readonly getDoc: GetDoc;
    readonly updateDoc: UpdateDoc;
    readonly deleteDoc: DeleteDoc;
  };
}) => Promise<void>;

/**
 * DocCommit
 */
export type DocCommit = UpdateDocCommit | DeleteDocCommit;

/**
 * DeleteDocCommit
 */
export function DeleteDocCommit(): DeleteDocCommit {
  return { _type: 'delete' };
}

export type DeleteDocCommit = { readonly _type: 'delete' };

/**
 * UpdateDocCommit
 */
export type UpdateDocCommitValue = {
  readonly data: WriteDoc;
  readonly onDocAbsent: 'createDoc' | 'doNotUpdate';
};

export function UpdateDocCommit(value: UpdateDocCommitValue): UpdateDocCommit {
  return { ...value, _type: 'update' };
}

export type UpdateDocCommit = {
  readonly _type: 'update';
} & UpdateDocCommitValue;

/**
 *Errors
 */

/**
 *InvalidFieldTypeError
 */
export function InvalidFieldTypeError(): InvalidFieldTypeError {
  return { _type: 'InvalidFieldTypeError' };
}

export type InvalidFieldTypeError = {
  readonly _type: 'InvalidFieldTypeError';
};

/**
 * GetDocError
 */
export function GetDocError(): GetDocError {
  return { _type: 'GetDocError' };
}

export type GetDocError = {
  readonly _type: 'GetDocError';
};

/**
 * IncompatibleDocOpError
 */
export function IncompatibleDocOpError(): IncompatibleDocOpError {
  return { _type: 'IncompatibleDocOpError' };
}

export type IncompatibleDocOpError = {
  readonly _type: 'IncompatibleDocOpError';
};

/**
 * DraftGetTransactionCommitError
 */
export type DraftGetTransactionCommitError = GetDocError | InvalidFieldTypeError;

/**
 * GetTransactionCommitError
 */
export type GetTransactionCommitError = IncompatibleDocOpError | DraftGetTransactionCommitError;

/**
 * GetRelError
 */
export type GetRelError = InvalidFieldTypeError | GetDocError;

/**
 *  DraftError
 */
export function DraftError(): DraftError {
  return { _type: 'DraftError' };
}
export type DraftError = {
  readonly _type: 'DraftError';
};
