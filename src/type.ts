import { Dictionary, Field_1, Field_2, Schema } from 'kira-core';

// utils

export type Either<T, E> =
  | { readonly tag: 'right'; readonly value: T }
  | { readonly tag: 'left'; readonly error: E };

export type ActionError = {
  readonly errorType: 'invalid_data_type';
};

// Special Fields
export type IncrementFieldValue = {
  readonly __fieldType: 'increment';
  readonly value: number;
};

export type CreationTimeFieldValue = {
  readonly __fieldType: 'creation_time';
};

// Doc
export type DocKey = { readonly col: string; readonly id: string };

export type RefFieldData = { readonly id: string } & DocData;
export type DocData = { readonly [key: string]: string | number | RefFieldData };

export type DocSnapshot = {
  readonly id: string;
  readonly data: DocData;
};

export type ResultDocData = {
  readonly [key: string]:
    | string
    | number
    | IncrementFieldValue
    | CreationTimeFieldValue
    | ResultDocData;
};

// Db
export type GetDoc = (key: DocKey) => Promise<DocSnapshot>;

export type Query<T extends string = string> = {
  readonly col: T;
  readonly limit?: number;
  readonly orderByField?: string;
  readonly orderDirection?: 'asc' | 'desc';
};

export type QueryDoc = (query: Query) => Promise<readonly DocSnapshot[]>;

// Trigger
export type DocChange = {
  readonly before: DocSnapshot;
  readonly after: DocSnapshot;
};

export type Snapshot = DocSnapshot | DocChange;

export type ActionContext<T extends TriggerType> = {
  readonly getDoc: GetDoc;
  readonly snapshot: SnapshotOfTriggerType<T>;
};

type SnapshotOfTriggerType<T extends TriggerType> = T extends 'onCreate'
  ? DocSnapshot
  : T extends 'onDelete'
  ? DocSnapshot
  : T extends 'onUpdate'
  ? DocChange
  : never;

export type ActionResult = Dictionary<Dictionary<ResultDocData>>;

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

export type EntryOf<T> = T extends Dictionary<infer R> ? R : never;

export type FieldOf<S extends Schema> = EntryOf<EntryOf<S['cols']>>;

export type SchemaToTriggerActions<S extends Schema> = (schema: S) => Actions;

export type Actions = {
  readonly onCreate: Dictionary<readonly Action<'onCreate'>[]>;
  readonly onUpdate: Dictionary<readonly Action<'onUpdate'>[]>;
  readonly onDelete: Dictionary<readonly Action<'onDelete'>[]>;
};
