import { Doc, DocKey, WriteDoc } from 'kira-core';
import { Either } from 'trimop';

/**
 *DB
 */
export type DBWriteResult = { readonly isSuccess: boolean };

/**
 * GetDoc
 */
export type GetDoc<F extends GetDocFailure = GetDocFailure> = (
  key: DocKey
) => Promise<Either<F, Doc>>;

export type GetDocFailure = {
  readonly _failureType: 'GetDocFailure';
  readonly _getDocFailure: string;
};

/**
 * UpdateDoc
 */
export type UpdateDoc<F extends UpdateDocFailure = UpdateDocFailure, UpdateDocResult = unknown> =
  (param: {
    readonly key: DocKey;
    readonly docData: WriteDoc;
  }) => Promise<Either<F, UpdateDocResult>>;

export type UpdateDocFailure = {
  readonly _failureType: 'GetDocFailure';
  readonly _updateDocFailure: string;
};

/**
 * DeleteDoc
 */
export type DeleteDoc<F extends DeleteDocFailure = DeleteDocFailure, DeleteDocResult = unknown> = (
  key: DocKey
) => Promise<Either<F, DeleteDocResult>>;

export type DeleteDocFailure = {
  readonly _failureType: 'DeleteDocFailure';
  readonly _deleteDocFailure: string;
};
