import { GetDocError } from './db';
import { Doc, Field } from './doc';

/**
 *InvalidFieldTypeError
 */
export function InvalidFieldTypeError(value: InvalidFieldTypeErrorValue): InvalidFieldTypeError {
  return { _type: 'InvalidFieldTypeError', ...value };
}

export type InvalidFieldTypeErrorValue = {
  readonly colName: string;
  readonly fieldName: string;
  readonly expectedFieldType: Field['_type'];
  readonly doc: Doc;
};

export type InvalidFieldTypeError = InvalidFieldTypeErrorValue & {
  readonly _type: 'InvalidFieldTypeError';
};

/**
 * GetRelError
 */
export type GetRelError = InvalidFieldTypeError | GetDocError;
