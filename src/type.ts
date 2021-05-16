import { Dictionary, Field_1, Field_2, FieldOf, Schema } from 'kira-core';

import { InDocSnapshot, OutDocData } from './doc-data';

// utils
export type Either<T, E> =
  | { readonly tag: 'right'; readonly value: T }
  | { readonly tag: 'left'; readonly error: E };

export type ActionError = {
  readonly errorType: 'invalid_data_type';
};

// Doc
export type DocKey = { readonly col: string; readonly id: string };

// Db
export type GetDoc<E> = (key: DocKey) => Promise<Either<InDocSnapshot, E>>;
export type WriteDoc<WR> = (key: DocKey, docData: OutDocData) => Promise<WR>;

export type Query<T extends string = string> = {
  readonly col: T;
  readonly limit?: number;
  readonly orderByField?: string;
  readonly orderDirection?: 'asc' | 'desc';
};

export type QueryDoc = (query: Query) => Promise<readonly InDocSnapshot[]>;

// Trigger
export type InDocChange = {
  readonly before: InDocSnapshot;
  readonly after: InDocSnapshot;
};

export type ActionContext<T extends TriggerType, GDE> = {
  readonly getDoc: GetDoc<GDE>;
  readonly snapshot: SnapshotOfTriggerType<T>;
};

export type SnapshotOfTriggerType<T extends TriggerType> = T extends 'onCreate'
  ? InDocSnapshot
  : T extends 'onDelete'
  ? InDocSnapshot
  : T extends 'onUpdate'
  ? InDocChange
  : never;

export type ActionResult = Dictionary<Dictionary<OutDocData>>;

export type Action<T extends TriggerType, GDE> = (
  context: ActionContext<T, GDE>
) => Promise<Either<ActionResult, ActionError | GDE>>;

export type TriggerType = 'onCreate' | 'onUpdate' | 'onDelete';

export type Trigger<T extends TriggerType, GDE> = Dictionary<Action<T, GDE>>;

// Schema_1
export type MakeTriggerContext_1<F extends Field_1> = {
  readonly userColName: string;
  readonly colName: string;
  readonly field: F;
  readonly fieldName: string;
};

// Schema_2
export type MakeTriggerContext_2<F extends Field_2> = {
  readonly colName: string;
  readonly field: F;
  readonly fieldName: string;
};

// blackmagics
export type FieldToTrigger<S extends Schema, T extends TriggerType, GDE> = (args: {
  readonly schema: S;
  readonly fieldName: string;
  readonly field: FieldOf<S>;
  readonly colName: string;
}) => Trigger<T, GDE> | undefined;

export type Actions<GDE> = {
  readonly onCreate: Dictionary<readonly Action<'onCreate', GDE>[]>;
  readonly onUpdate: Dictionary<readonly Action<'onUpdate', GDE>[]>;
  readonly onDelete: Dictionary<readonly Action<'onDelete', GDE>[]>;
};
