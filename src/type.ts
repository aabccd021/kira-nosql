import { Dictionary, Field_1, Field_2, FieldOf, Schema } from 'kira-core';

import { ReadDocData, ReadDocSnapshot, WriteDocData } from './doc-data';

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
export type GetDoc<E> = (key: DocKey) => Promise<Either<ReadDocSnapshot, E>>;
export type MergeDoc<WR> = (key: DocKey, docData: WriteDocData) => Promise<WR>;
export type DeleteDoc<WR> = (key: DocKey) => Promise<WR>;

export type Query<T extends string = string> = {
  readonly col: T;
  readonly limit?: number;
  readonly where?: {
    readonly field: readonly string[];
    readonly op: '==';
    readonly value: string;
  };
  readonly orderByField?: string;
  readonly orderDirection?: 'asc' | 'desc';
};

export type QueryDoc<E> = (query: Query) => Promise<Either<readonly ReadDocSnapshot[], E>>;

// Trigger
export type ReadDocChange = {
  readonly id: string;
  readonly before: ReadDocData;
  readonly after: ReadDocData;
};

export type ActionContext<T extends TriggerType, GDE, QE> = {
  readonly getDoc: GetDoc<GDE>;
  readonly queryDoc: QueryDoc<QE>;
  readonly snapshot: SnapshotOfTriggerType<T>;
};

export type SnapshotOfTriggerType<T extends TriggerType> = T extends 'onCreate'
  ? ReadDocSnapshot
  : T extends 'onDelete'
  ? ReadDocSnapshot
  : T extends 'onUpdate'
  ? ReadDocChange
  : never;

export type DocOp =
  | {
      readonly op: 'merge';
      readonly runTrigger?: true;
      readonly data: WriteDocData;
    }
  | { readonly op: 'delete' };

export type ActionResult = Dictionary<Dictionary<DocOp>>;

export type Action<T extends TriggerType, GDE, QE> = (
  context: ActionContext<T, GDE, QE>
) => Promise<Either<ActionResult, ActionError | GDE | QE>>;

export type TriggerType = 'onCreate' | 'onUpdate' | 'onDelete';

export type Trigger<T extends TriggerType, GDE, QE> = Dictionary<Action<T, GDE, QE>>;

// Schema_1
export type MakeTriggerContext_1<F extends Field_1> = {
  readonly userCol: string;
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
export type FieldToTrigger<S extends Schema, T extends TriggerType, GDE, QE> = (args: {
  readonly schema: S;
  readonly fieldName: string;
  readonly field: FieldOf<S>;
  readonly colName: string;
}) => Trigger<T, GDE, QE> | undefined;

export type Actions<GDE, QE> = {
  readonly onCreate: Dictionary<readonly Action<'onCreate', GDE, QE>[]>;
  readonly onUpdate: Dictionary<readonly Action<'onUpdate', GDE, QE>[]>;
  readonly onDelete: Dictionary<readonly Action<'onDelete', GDE, QE>[]>;
};
