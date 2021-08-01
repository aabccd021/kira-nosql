import { Field, WriteField } from 'kira-core';

/**
 * WriteToDocFailure
 */
export function WriteToDocFailure(value: WriteToDocFailureValue): WriteToDocFailure {
  return { _type: 'WriteToDocFailure', ...value };
}

export type WriteToDocFailureValue = {
  readonly expectedFieldTypes: readonly (Field['_type'] | WriteField['_type'] | 'undefined')[];
  readonly field: Field | undefined;
};

export type WriteToDocFailure = WriteToDocFailureValue & {
  readonly _type: 'WriteToDocFailure';
};
