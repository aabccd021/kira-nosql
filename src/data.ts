import assertNever from 'assert-never';

import {
  DateField,
  Doc,
  Either,
  Field,
  Left,
  NumberField,
  RefField,
  Right,
  StringArrayField,
  WriteDoc,
  WriteField,
  WriteToDocError,
} from './type';

export function writeToDoc({
  oldDoc,
  docData,
}: {
  readonly oldDoc: Doc | undefined;
  readonly docData: WriteDoc;
}): Either<WriteToDocError, Doc> {
  return Object.entries(docData).reduce<Either<WriteToDocError, Doc>>(
    (acc, [fieldName, writeField]) => {
      if (acc._tag === 'left') return acc;
      const oldField = oldDoc?.[fieldName];
      const field = writeToField({ oldField, writeField });
      if (field._tag === 'left') return field;
      if (field.value === undefined) return acc;
      return Right({
        ...acc.value,
        [fieldName]: field.value,
      });
    },
    Right(oldDoc ?? {})
  );
}

function writeToField({
  oldField,
  writeField,
}: {
  readonly oldField: Field | undefined;
  readonly writeField: WriteField;
}): Either<WriteToDocError, Field | undefined> {
  if (
    writeField._type === 'string' ||
    writeField._type === 'number' ||
    writeField._type === 'stringArray' ||
    writeField._type === 'image' ||
    writeField._type === 'date'
  ) {
    return Right(writeField);
  }
  if (writeField._type === 'creationTime') {
    return Right(DateField(new Date()));
  }
  if (writeField._type === 'stringArrayRemove') {
    if (oldField === undefined) {
      return Right(undefined);
    }
    if (oldField._type !== 'stringArray') {
      return Left(
        WriteToDocError({
          expectedFieldTypes: ['stringArray'],
          field: oldField,
        })
      );
    }
    return Right(StringArrayField(oldField.value.filter((el) => el !== writeField.value)));
  }
  if (writeField._type === 'stringArrayUnion') {
    if (oldField === undefined || oldField._type === 'stringArray') {
      return Right(
        StringArrayField([...(oldField !== undefined ? oldField.value : []), writeField.value])
      );
    }
    return Left(
      WriteToDocError({
        expectedFieldTypes: ['stringArray', 'undefined'],
        field: oldField,
      })
    );
  }
  if (writeField._type === 'increment') {
    if (oldField === undefined || oldField._type === 'number') {
      return Right(NumberField(oldField !== undefined ? oldField.value : 0 + writeField.value));
    }
    return Left(
      WriteToDocError({
        expectedFieldTypes: ['number', 'undefined'],
        field: oldField,
      })
    );
  }
  if (writeField._type === 'ref') {
    if (oldField?._type !== 'ref') {
      return Left(
        WriteToDocError({
          expectedFieldTypes: ['ref'],
          field: oldField,
        })
      );
    }
    const newDoc = writeToDoc({ oldDoc: oldField.value.data, docData: writeField.value });

    if (newDoc._tag === 'left') return newDoc;

    return Right(
      RefField({
        id: oldField.value.id,
        data: newDoc.value,
      })
    );
  }
  assertNever(writeField);
}
