import { GetDocError } from './db';
import { Doc, Field, WriteField } from './doc';

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

/**
 * WriteToDocError
 */
export function WriteToDocError(value: WriteToDocErrorValue): WriteToDocError {
  return { _type: 'WriteToDocError', ...value };
}

export type WriteToDocErrorValue = {
  readonly expectedFieldTypes: readonly (Field['_type'] | WriteField['_type'] | 'undefined')[];
  readonly field: Field | undefined;
};

export type WriteToDocError = WriteToDocErrorValue & {
  readonly _type: 'WriteToDocError';
};
