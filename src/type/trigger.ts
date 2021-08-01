import { DocSnapshot, FieldSpec, InvalidFieldTypeFailure, WriteDoc } from 'kira-core';
import { Dict, Either } from 'trimop';

import { RelKey } from '../util';
import { DeleteDoc, GetDoc, GetDocFailure, UpdateDoc } from './db';
import { DocChange, TriggerSnapshot } from './doc';

/**
 *Trigger
 */
export type Trigger = Dict<ColTrigger>;

export type ColTrigger = {
  readonly onCreate?: ActionTrigger<DocSnapshot>;
  readonly onUpdate?: ActionTrigger<DocChange>;
  readonly onDelete?: ActionTrigger<DocSnapshot>;
};

export type ActionTrigger<S extends TriggerSnapshot> = {
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

export type ActionDraft<S extends TriggerSnapshot> = Dict<ColDraft<S>>;

export type ColDraft<S extends TriggerSnapshot> = {
  readonly getTransactionCommit?: DraftGetTransactionCommit<S>;
  readonly mayFailOp?: MayFailOp<S>;
};

/**
 * DraftGetTransactionCommit
 */
export type DraftGetTransactionCommitFailure = InvalidFieldTypeFailure | GetDocFailure;

export type DraftGetTransactionCommit<S extends TriggerSnapshot> = (param: {
  readonly snapshot: S;
  readonly getDoc: GetDoc;
}) => Promise<Either<DraftGetTransactionCommitFailure, TransactionCommit>>;

/**
 * SpecToDraft
 */
export type SpecToDraft = (param: {
  readonly context: {
    readonly colName: string;
    readonly fieldName: string;
  };
  readonly spec: FieldSpec;
}) => Draft;

/**
 *
 */
export type ExecOnRelDocs<T = unknown> = (p: {
  readonly relKey: RelKey;
  readonly exec: (doc: DocSnapshot) => Promise<T>;
}) => Promise<T>;

/**
 *Commit
 */
export type TransactionCommit = Dict<ColTransactionCommit>;

export type ColTransactionCommit = Dict<DocCommit>;

export type MayFailOp<S extends TriggerSnapshot, V = unknown> = (param: {
  readonly snapshot: S;
  readonly getDoc: GetDoc;
  readonly updateDoc: UpdateDoc;
  readonly deleteDoc: DeleteDoc;
  readonly execOnRelDocs: ExecOnRelDocs;
}) => Promise<V>;

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
 * IncompatibleOcOpFailure
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
 * GetTransactionCommitFailure
 */
export type GetTransactionCommitFailure =
  | IncompatibleDocOpFailure
  | InvalidFieldTypeFailure
  | DraftGetTransactionCommitFailure;
