import assertNever from 'assert-never';
import { Schema_1, Schema_2 } from 'kira-core';

import {
  makeOnCreateCountFieldTrigger,
  makeOnCreateCreationTimeFieldTrigger,
  makeOnCreateImageFieldTrigger,
  makeOnCreateOwnerFieldTrigger,
  makeOnCreateRefFieldTrigger,
  makeOnCreateStringFieldTrigger,
} from './on-create';
import { SchemaToTriggerActions } from './type';
import { schemaToTriggerActions } from './util';

export const schemaToActions_1: SchemaToTriggerActions<Schema_1> = (schema) => {
  return schemaToTriggerActions({
    schema,
    fieldToTrigger: {
      onCreate: ({ schema, fieldName, field, colName }) => {
        const context = { userColName: schema.userCol, colName, fieldName };
        if (field.type === 'count') return makeOnCreateCountFieldTrigger({ ...context, field });
        if (field.type === 'creationTime')
          return makeOnCreateCreationTimeFieldTrigger({ ...context, field });
        if (field.type === 'image') return makeOnCreateImageFieldTrigger({ ...context, field });
        if (field.type === 'owner') return makeOnCreateOwnerFieldTrigger({ ...context, field });
        if (field.type === 'ref') return makeOnCreateRefFieldTrigger({ ...context, field });
        if (field.type === 'string') return makeOnCreateStringFieldTrigger({ ...context, field });
        assertNever(field);
      },
    },
  });
};

export const schemaToActions_2: SchemaToTriggerActions<Schema_2> = (schema) => {
  return schemaToTriggerActions({
    schema,
    fieldToTrigger: {
      onCreate: ({ fieldName, field, colName }) => {
        const context = { colName, fieldName };
        if (field.type === 'count') return makeOnCreateCountFieldTrigger({ ...context, field });
        if (field.type === 'creationTime')
          return makeOnCreateCreationTimeFieldTrigger({ ...context, field });
        if (field.type === 'image') return makeOnCreateImageFieldTrigger({ ...context, field });
        if (field.type === 'ref') return makeOnCreateRefFieldTrigger({ ...context, field });
        if (field.type === 'string') return makeOnCreateStringFieldTrigger({ ...context, field });
        assertNever(field);
      },
    },
  });
};
