import { ImageFieldValue } from './type';

export function isStringArray(arr: unknown): arr is readonly string[] {
  return Array.isArray(arr) && typeof arr[0] === 'string';
}

export function isImageFieldValue(fieldValue: unknown): fieldValue is ImageFieldValue {
  return typeof fieldValue === 'object' && typeof (fieldValue as ImageFieldValue).url === 'string';
}
