import { getErrorStackString } from './mutable';

/**
 *Either
 */
export type Either<E, V> = Left<E> | Right<V>;

export function Right<V>(value: V): Right<V> {
  return { _tag: 'right', value };
}

export type Right<V> = { readonly _tag: 'right'; readonly value: V };

export function Left<V>(error: V): Left<V> {
  return {
    _tag: 'left',
    error,
    stack: getErrorStackString() ?? new Error().stack,
  };
}

export type Left<E> = {
  readonly _tag: 'left';
  readonly error: E;
  readonly stack: string | undefined;
};

/**
 *Key
 */
export type DocKey = {
  readonly col: string;
  readonly id: string;
};

export type RelKey = {
  readonly refedId: string;
  readonly refedCol: string;
  readonly referField: string;
  readonly referCol: string;
};
