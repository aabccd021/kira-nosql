export type InDocSnapshot = {
  readonly id: string;
  readonly data?: InDocData;
};

/**
 * DocData
 */
export type InDocData = { readonly [key: string]: InField };

export type OutDocData = { readonly [key: string]: OutField };

/**
 * Field
 */
export type PrimitiveField = StringPrimitiveField | NumberPrimitiveField | DatePrimitiveField;

export type InField = PrimitiveField | RefInField;

export type OutField = PrimitiveField | CreationTimeOutField | IncrementOutField | RefOutField;

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
 * InFields
 */
export type RefInField = {
  readonly type: 'ref';
  readonly value: InDocSnapshot;
};

/**
 * OutFields
 */
export type RefOutField = {
  readonly type: 'ref';
  readonly value: OutDocData;
};

export type CreationTimeOutField = {
  readonly type: 'creationTime';
};

export type IncrementOutField = {
  readonly type: 'increment';
  readonly incrementValue: number;
};
