import { Dictionary, FieldSpec } from 'kira-core';

import { DeleteDoc, GetDoc, GetDocError, UpdateDoc } from './db';
import { DocChange, DocSnapshot, Snapshot, WriteDoc } from './doc';
import { InvalidFieldTypeError } from './error';
import { Either } from '../util';

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

/**
 * DraftGetTransactionCommit
 */
export type DraftGetTransactionCommitError = InvalidFieldTypeError | GetDocError;

export type DraftGetTransactionCommit<S extends Snapshot> = (param: {
  readonly snapshot: S;
  readonly db: {
    readonly getDoc: GetDoc;
  };
}) => Promise<Either<DraftGetTransactionCommitError, TransactionCommit>>;

/**
 * SpecToDraft
 */
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
  return { _op: 'delete' };
}

export type DeleteDocCommit = { readonly _op: 'delete' };

/**
 * UpdateDocCommit
 */
export type UpdateDocCommitValue = {
  readonly data: WriteDoc;
  readonly onDocAbsent: 'createDoc' | 'doNotUpdate';
};

export function UpdateDocCommit(value: UpdateDocCommitValue): UpdateDocCommit {
  return { ...value, _op: 'update' };
}

export type UpdateDocCommit = {
  readonly _op: 'update';
} & UpdateDocCommitValue;

/**
 * IncompatibleDocOpError
 */
export function IncompatibleDocOpError(value: IncompatibleDocOpValue): IncompatibleDocOpError {
  return { _type: 'IncompatibleDocOpError', ...value };
}

export type IncompatibleDocOpValue = {
  readonly docCommit1: DocCommit;
  readonly docCommit2: DocCommit;
};

export type IncompatibleDocOpError = IncompatibleDocOpValue & {
  readonly _type: 'IncompatibleDocOpError';
};

/**
 * GetTransactionCommitError
 */
export type GetTransactionCommitError =
  | IncompatibleDocOpError
  | InvalidFieldTypeError
  | DraftGetTransactionCommitError;
