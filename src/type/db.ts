import { Doc, WriteDoc } from './doc';
import { DocKey, Either } from '../util';

/**
 *DB
 */
export type DBWriteResult = { readonly isSuccess: boolean };

export type DB = {
  readonly getDoc: GetDoc;
  readonly updateDoc: UpdateDoc;
  readonly deleteDoc: DeleteDoc;
};

/**
 * GetDoc
 */
export type GetDoc<T = unknown> = (key: DocKey) => Promise<Either<GetDocError<T>, Doc>>;

export function GetDocError<T = unknown>(reason: T): GetDocError<T> {
  return { _type: 'GetDocError', reason };
}

export type GetDocError<T = unknown> = {
  readonly _type: 'GetDocError';
  readonly reason: T;
};

/**
 * UpdateDoc
 */
export type UpdateDoc<UpdateDocError = unknown, UpdateDocResult = unknown> = (param: {
  readonly key: DocKey;
  readonly docData: WriteDoc;
}) => Promise<Either<UpdateDocError, UpdateDocResult>>;

/**
 * DeleteDoc
 */
export type DeleteDoc<DeleteDocError = unknown, DeleteDocResult = unknown> = (
  key: DocKey
) => Promise<Either<DeleteDocError, DeleteDocResult>>;
