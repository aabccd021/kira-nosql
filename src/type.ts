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
export type GetDoc = (key: DocKey) => Promise<InDocSnapshot>;

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

export type ActionContext<T extends TriggerType> = {
  readonly getDoc: GetDoc;
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

export type Action<T extends TriggerType> = (
  context: ActionContext<T>
) => Promise<Either<ActionResult, ActionError>>;

export type TriggerType = 'onCreate' | 'onUpdate' | 'onDelete';

export type Trigger<T extends TriggerType> = Dictionary<Action<T>>;

// Schema_1
export type MakeTrigger_1<T extends TriggerType, F extends Field_1> = (context: {
  readonly userColName: string;
  readonly colName: string;
  readonly field: F;
  readonly fieldName: string;
}) => Trigger<T> | undefined;

// Schema_2
export type MakeTrigger_2<T extends TriggerType, F extends Field_2> = (context: {
  readonly colName: string;
  readonly field: F;
  readonly fieldName: string;
}) => Trigger<T> | undefined;

// blackmagics
export type FieldToTrigger<S extends Schema, T extends TriggerType> = (args: {
  readonly schema: S;
  readonly fieldName: string;
  readonly field: FieldOf<S>;
  readonly colName: string;
}) => Trigger<T> | undefined;

export type SchemaToTriggerActions<S extends Schema> = (schema: S) => Actions;

export type Actions = {
  readonly onCreate: Dictionary<readonly Action<'onCreate'>[]>;
  readonly onUpdate: Dictionary<readonly Action<'onUpdate'>[]>;
  readonly onDelete: Dictionary<readonly Action<'onDelete'>[]>;
};
