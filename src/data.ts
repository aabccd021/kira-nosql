// import assertNever from 'assert-never';

// import {
//   DateField,
//   Doc,
//   Either,
//   Field,
//   Failed(,
//   NumberField,
//   RefField,
//   Value(,
//   StringArrayField,
//   WriteDoc,
//   WriteField,
//   WriteToDocFailure,
// } from './type';

// export function writeToDoc({
//   oldDoc,
//   docData,
// }: {
//   readonly oldDoc: Doc | undefined;
//   readonly docData: WriteDoc;
// }): Either<WriteToDocFailure, Doc> {
//   return Object.entries(docData).reduce<Either<WriteToDocFailure, Doc>>(
//     (acc, [fieldName, writeField]) => {
//       if (acc._tag === 'left') return acc;
//       const oldField = oldDoc?.[fieldName];
//       const field = writeToField({ oldField, writeField });
//       if (field._tag === 'left') return field;
//       if (field.value === undefined) return acc;
//       return Value(({
//         ...acc.value,
//         [fieldName]: field.value,
//       });
//     },
//     Value((oldDoc ?? {})
//   );
// }

// function writeToField({
//   oldField,
//   writeField,
// }: {
//   readonly oldField: Field | undefined;
//   readonly writeField: WriteField;
// }): Either<WriteToDocFailure, Field | undefined> {
//   if (
//     writeField._type === 'string' ||
//     writeField._type === 'number' ||
//     writeField._type === 'stringArray' ||
//     writeField._type === 'image' ||
//     writeField._type === 'date'
//   ) {
//     return Value((writeField);
//   }
//   if (writeField._type === 'creationTime') {
//     return Value((DateField(new Date()));
//   }
//   if (writeField._type === 'stringArrayRemove') {
//     if (oldField === undefined) {
//       return Value((undefined);
//     }
//     if (oldField._type !== 'stringArray') {
//       return Failed((
//         WriteToDocFailure({
//           expectedFieldTypes: ['stringArray'],
//           field: oldField,
//         })
//       );
//     }
//     return Value((StringArrayField(oldField.value.filter((el) => el !== writeField.value)));
//   }
//   if (writeField._type === 'stringArrayUnion') {
//     if (oldField === undefined || oldField._type === 'stringArray') {
//       return Value((
//         StringArrayField([...(oldField !== undefined ? oldField.value : []), writeField.value])
//       );
//     }
//     return Failed((
//       WriteToDocFailure({
//         expectedFieldTypes: ['stringArray', 'undefined'],
//         field: oldField,
//       })
//     );
//   }
//   if (writeField._type === 'increment') {
//     if (oldField === undefined || oldField._type === 'number') {
//       return Value((NumberField(oldField !== undefined ? oldField.value : 0 + writeField.value));
//     }
//     return Failed((
//       WriteToDocFailure({
//         expectedFieldTypes: ['number', 'undefined'],
//         field: oldField,
//       })
//     );
//   }
//   if (writeField._type === 'ref') {
//     if (oldField?._type !== 'ref') {
//       return Failed((
//         WriteToDocFailure({
//           expectedFieldTypes: ['ref'],
//           field: oldField,
//         })
//       );
//     }
//     const newDoc = writeToDoc({ oldDoc: oldField.value.data, docData: writeField.value });

//     if (newDoc._tag === 'left') return newDoc;

//     return Value((
//       RefField({
//         id: oldField.value.id,
//         data: newDoc.value,
//       })
//     );
//   }
//   assertNever(writeField);
// }
