import { Doc, DocKey, DocSnapshot, FieldSpec, WriteDoc } from 'kira-core';
import { Dict, Either, Option } from 'trimop';

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
export type ExecOnRelDocs = (
  relKey: RelKey,
  exec: (id: string) => Promise<unknown>
) => Promise<unknown>;

/**
 *
 */
export type GetDocError = {
  readonly _errorType: 'GetDocError';
  readonly _getDocError: string;
};

export type GetDoc<F extends GetDocError = GetDocError> = (key: DocKey) => Promise<Either<F, Doc>>;

/**
 *
 */
export type UpdateDocError = {
  readonly _errorType: 'GetDocError';
  readonly _updateDocError: string;
};

export type UpdateDoc<F extends UpdateDocError = UpdateDocError, TResult = unknown> = (param: {
  readonly key: DocKey;
  readonly writeDoc: WriteDoc;
}) => Promise<Either<F, TResult>>;

/**
 *
 */
export type DeleteDocError = {
  readonly _deleteDocError: string;
  readonly _errorType: 'DeleteDocError';
};

export type DeleteDoc<F extends DeleteDocError = DeleteDocError, TResult = unknown> = (
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
 * InvalidFieldTypeError
 */
export type InvalidFieldTypeError = {
  readonly _errorType: 'InvalidFieldType';
  readonly doc: Doc;
  readonly fieldName: string;
};

export const InvalidFieldTypeError: (
  p: Omit<InvalidFieldTypeError, '_errorType'>
) => InvalidFieldTypeError = (p) => ({
  ...p,
  _errorType: 'InvalidFieldType',
});

/**
 *
 */
export type DraftGetTransactionCommitError = { readonly _errorType: string } & (
  | InvalidFieldTypeError
  | GetDocError
);

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
  readonly onDocAbsent: 'doNotUpdate';
  //| 'createDoc';
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
}) => Promise<Either<DraftGetTransactionCommitError, TransactionCommit>>;

/**
 *
 */
export type PropagationOp<S extends TriggerSnapshot> = (param: {
  readonly deleteDoc: DeleteDoc;
  readonly execOnRelDocs: ExecOnRelDocs;
  readonly snapshot: S;
  readonly updateDoc: UpdateDoc;
}) => Promise<unknown>;

/**
 *
 */
export type ColDraft<S extends TriggerSnapshot> = {
  readonly getTransactionCommit: Option<GetTransactionCommit<S>>;
  readonly propagationOp: Option<PropagationOp<S>>;
};

/**
 *
 */
export type ActionDraft<S extends TriggerSnapshot> = Dict<ColDraft<S>>;

/**
 *
 */
export type Draft = {
  readonly onCreate: Option<ActionDraft<DocSnapshot>>;
  readonly onDelete: Option<ActionDraft<DocSnapshot>>;
  readonly onUpdate: Option<ActionDraft<DocChange>>;
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
  readonly onCreate: Option<ActionTrigger<DocSnapshot>>;
  readonly onDelete: Option<ActionTrigger<DocSnapshot>>;
  readonly onUpdate: Option<ActionTrigger<DocChange>>;
};

/**
 *
 */
export type Trigger = Dict<ColTrigger>;

/**
 *
 */
// export type IncompatibleDocOpError = {
//   readonly _errorType: 'IncompatibleDocOp';
//   readonly docCommit1: DocCommit;
//   readonly docCommit2: DocCommit;
// };

// export function IncompatibleDocOpError(
//   p: Omit<IncompatibleDocOpError, '_errorType'>
// ): IncompatibleDocOpError {
//   return {
//     ...p,
//     _errorType: 'IncompatibleDocOp',
//   };
// }

/**
 *
 */
export type GetTransactionCommitError =
  // IncompatibleDocOpError |
  DraftGetTransactionCommitError;
