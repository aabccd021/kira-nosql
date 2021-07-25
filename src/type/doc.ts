import { Dictionary } from 'kira-core';

/**
 *Snapshot
 */
export type Snapshot = DocSnapshot | DocChange;

export type DocChange = {
  readonly id: string;
  readonly before: Doc;
  readonly after: Doc;
};

export type DocSnapshot = {
  readonly id: string;
  readonly data: Doc;
};

/**
 *Doc
 */
export type Doc = Dictionary<Field>;

export type WriteDoc = Dictionary<WriteField>;

/**
 *Field
 */
export type ReadWriteField = StringField | NumberField | DateField | StringArrayField | ImageField;

export type Field = ReadWriteField | RefField;

export type WriteField =
  | ReadWriteField
  | CreationTimeField
  | IncrementField
  | StringArrayUnionField
  | StringArrayRemoveField
  | RefWriteField;

/**
 *Primitive Fields
 */

/**
 *StringField
 */
export function StringField(value: string): StringField {
  return { _type: 'string', value };
}

export type StringField = {
  readonly _type: 'string';
  readonly value: string;
};

/**
 *NumberField
 */
export function NumberField(value: number): NumberField {
  return { _type: 'number', value };
}

export type NumberField = {
  readonly _type: 'number';
  readonly value: number;
};

/**
 *DateField
 */
export function DateField(value: Date): DateField {
  return { _type: 'date', value };
}

export type DateField = {
  readonly _type: 'date';
  readonly value: Date;
};

/**
 *ReadFields
 */

/**
 *RefReadField
 */
export function RefField(value: DocSnapshot): RefField {
  return { _type: 'ref', value };
}

export type RefField = {
  readonly _type: 'ref';
  readonly value: DocSnapshot;
};

/**
 *StringArrayField
 */
export function StringArrayField(value: readonly string[]): StringArrayField {
  return { _type: 'stringArray', value };
}

export type StringArrayField = {
  readonly _type: 'stringArray';
  readonly value: readonly string[];
};

/**
 *ImageField
 */
export function ImageField(value: ImageFieldValue): ImageField {
  return { _type: 'image', value };
}

export type ImageField = {
  readonly _type: 'image';
  readonly value: ImageFieldValue;
};

export type ImageFieldValue = {
  readonly url: string;
};

/**
 *WriteFields
 */

/**
 *RefWriteField
 */
export function RefWriteField(value: WriteDoc): RefWriteField {
  return { _type: 'ref', value };
}

export type RefWriteField = {
  readonly _type: 'ref';
  readonly value: WriteDoc;
};

/**
 *CreationTimeField
 */
export function CreationTimeField(): CreationTimeField {
  return { _type: 'creationTime' };
}

export type CreationTimeField = {
  readonly _type: 'creationTime';
};

/**
 *CreationTimeField
 */
export function IncrementField(value: number): IncrementField {
  return { _type: 'increment', value };
}

export type IncrementField = {
  readonly _type: 'increment';
  readonly value: number;
};

/**
 *StringArrayUnionField
 */
export function StringArrayUnionField(value: string): StringArrayUnionField {
  return { _type: 'stringArrayUnion', value };
}
export type StringArrayUnionField = {
  readonly _type: 'stringArrayUnion';
  readonly value: string;
};

/**
 *StringArrayRemoveField
 */
export function StringArrayRemoveField(value: string): StringArrayRemoveField {
  return { _type: 'stringArrayRemove', value };
}

export type StringArrayRemoveField = {
  readonly _type: 'stringArrayRemove';
  readonly value: string;
};
