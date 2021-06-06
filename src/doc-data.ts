export type ReadDocSnapshot = {
  readonly id: string;
  readonly data: ReadDocData;
};

/**
 * DocData
 */
export type ReadDocData = { readonly [key: string]: ReadField };

export type WriteDocData = { readonly [key: string]: WriteField };

/**
 * Field
 */
export type PrimitiveField = StringPrimitiveField | NumberPrimitiveField | DatePrimitiveField;

export type ReadField = PrimitiveField | RefReadField;

export type WriteField =
  | PrimitiveField
  | CreationTimeWriteField
  | IncrementWriteField
  | RefWriteField;

/**
 * Primitive Fields
 */
export type StringPrimitiveField = {
  readonly type: 'string';
  readonly value: string;
};

export type NumberPrimitiveField = {
  readonly type: 'number';
  readonly value: number;
};

export type DatePrimitiveField = {
  readonly type: 'date';
  readonly value: Date;
};

/**
 * ReadFields
 */
export type RefReadField = {
  readonly type: 'ref';
  readonly value: ReadDocSnapshot;
};

/**
 * WriteFields
 */
export type RefWriteField = {
  readonly type: 'ref';
  readonly value: WriteDocData;
};

export type CreationTimeWriteField = {
  readonly type: 'creationTime';
};

export type IncrementWriteField = {
  readonly type: 'increment';
  readonly incrementValue: number;
};
