import { Field } from './schema';

// utils
export type Dictionary<T> = Record<string, T>;

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

export type RefField = { readonly id: string } & DocData;
export type DocData = { readonly [key: string]: string | number | RefField };

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

export type ActionContext<T extends Snapshot> = {
  readonly getDoc: GetDoc;
  readonly snapshot: T;
};

export type ActionResult = Dictionary<Dictionary<ResultDocData>>;

export type Action<T extends Snapshot> = (
  context: ActionContext<T>
) => Promise<Either<ActionResult, ActionError>>;

export type TriggerContext = {
  readonly userColName: string;
  readonly colName: string;
  readonly field: Field;
  readonly fieldName: string;
};

export type Trigger<T extends Snapshot> = Dictionary<Action<T>>;

export type MakeTrigger<T extends Snapshot> = (context: TriggerContext) => Trigger<T> | undefined;
