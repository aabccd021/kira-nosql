import { Doc, DocKey, DocSnapshot, FieldSpec, InvalidFieldTypeFailure, WriteDoc } from 'kira-core';
import { Dict, Either } from 'trimop';

/**
 *
 */
export type RelKey = {
  readonly refedCol: string;
  readonly refedId: string;
  readonly referCol: string;
  readonly referField: string;
};

/**
 *
 */
export type ExecOnRelDocsFailure = {
  readonly _failureType: 'ExecOnRelDocs';
  readonly _getDocFailure: string;
};

export type ExecOnRelDocs<
  F extends ExecOnRelDocsFailure = ExecOnRelDocsFailure,
  TResult = unknown
> = (relKey: RelKey, exec: (doc: DocSnapshot) => Promise<TResult>) => Promise<Either<F, TResult>>;

/**
 *
 */
export type GetDocFailure = {
  readonly _failureType: 'GetDocFailure';
  readonly _getDocFailure: string;
};

export type GetDoc<F extends GetDocFailure = GetDocFailure> = (
  key: DocKey
) => Promise<Either<F, Doc>>;

/**
 *
 */
export type UpdateDocFailure = {
  readonly _failureType: 'GetDocFailure';
  readonly _updateDocFailure: string;
};

export type UpdateDoc<F extends UpdateDocFailure = UpdateDocFailure, TResult = unknown> = (param: {
  readonly key: DocKey;
  readonly writeDoc: WriteDoc;
}) => Promise<Either<F, TResult>>;

/**
 *
 */
export type DeleteDocFailure = {
  readonly _deleteDocFailure: string;
  readonly _failureType: 'DeleteDocFailure';
};

export type DeleteDoc<F extends DeleteDocFailure = DeleteDocFailure, TResult = unknown> = (
  key: DocKey
) => Promise<Either<F, TResult>>;

/**
 *
 */
export type DocChange = {
  readonly after: Doc;
  readonly before: Doc;
  readonly id: string;
};

/**
 *
 */
export type TriggerSnapshot = DocSnapshot | DocChange;

/**
 *
 */
export type DraftBuilderContext = {
  readonly colName: string;
  readonly fieldName: string;
};

/**
 *
 */
export type DraftGetTransactionCommitFailure = InvalidFieldTypeFailure | GetDocFailure;

/**
 *
 */
// export function DeleteDocCommit(): DeleteDocCommit {
//   return { _op: 'Delete' };
// }

// export type DeleteDocCommit = { readonly _op: 'Delete' };

/**
 *
 */
export type UpdateDocCommit = {
  readonly _op: 'Update';
  readonly onDocAbsent: 'createDoc' | 'doNotUpdate';
  readonly writeDoc: WriteDoc;
};

/**
 *
 */
export function UpdateDocCommit(value: Omit<UpdateDocCommit, '_op'>): UpdateDocCommit {
  return { ...value, _op: 'Update' };
}

/**
 *
 */
export type DocCommit = UpdateDocCommit;
//  | DeleteDocCommit;

/**
 *
 */
export type ColTransactionCommit = Dict<DocCommit>;

/**
 *
 */
export type TransactionCommit = Dict<ColTransactionCommit>;

/**
 *
 */
export type GetTransactionCommit<S extends TriggerSnapshot> = (param: {
  readonly getDoc: GetDoc;
  readonly snapshot: S;
}) => Promise<Either<DraftGetTransactionCommitFailure, TransactionCommit>>;

/**
 *
 */
export type PropagationOp<S extends TriggerSnapshot, V = unknown> = (param: {
  readonly deleteDoc: DeleteDoc;
  readonly execOnRelDocs: ExecOnRelDocs;
  readonly snapshot: S;
  readonly updateDoc: UpdateDoc;
}) => Promise<V>;

/**
 *
 */
export type ColDraft<S extends TriggerSnapshot> = {
  readonly getTransactionCommit?: GetTransactionCommit<S>;
  readonly propagationOp?: PropagationOp<S>;
};

/**
 *
 */
export type ActionDraft<S extends TriggerSnapshot> = Dict<ColDraft<S>>;

/**
 *
 */
export type Draft = {
  readonly onCreate?: ActionDraft<DocSnapshot>;
  readonly onDelete?: ActionDraft<DocSnapshot>;
  readonly onUpdate?: ActionDraft<DocChange>;
};

/**
 *
 */
export type BuildDraft = (param: {
  readonly context: {
    readonly colName: string;
    readonly fieldName: string;
  };
  readonly spec: FieldSpec;
}) => Draft;

/**
 *
 */
export type ActionTrigger<S extends TriggerSnapshot> = {
  readonly getTransactionCommits: readonly GetTransactionCommit<S>[];
  readonly propagationOps: readonly PropagationOp<S>[];
};

/**
 *
 */
export type ColTrigger = {
  readonly onCreate?: ActionTrigger<DocSnapshot>;
  readonly onDelete?: ActionTrigger<DocSnapshot>;
  readonly onUpdate?: ActionTrigger<DocChange>;
};

/**
 *
 */
export type Trigger = Dict<ColTrigger>;

/**
 *
 */
export type IncompatibleDocOpFailure = {
  readonly _failureType: 'IncompatibleDocOp';
  readonly docCommit1: DocCommit;
  readonly docCommit2: DocCommit;
};

export const IncompatibleDocOpFailure: (
  p: Omit<IncompatibleDocOpFailure, '_failureType'>
) => IncompatibleDocOpFailure = (p) => ({
  ...p,
  _failureType: 'IncompatibleDocOp',
});

/**
 *
 */
export type GetTransactionCommitFailure =
  | IncompatibleDocOpFailure
  | DraftGetTransactionCommitFailure;
