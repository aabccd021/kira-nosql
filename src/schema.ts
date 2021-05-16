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
import { Actions } from './type';
import { schemaToTriggerActions } from './util';

export function schemaToActions_1<GDE>(schema: Schema_1): Actions<GDE> {
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
}

export function schemaToActions_2<GDE>(schema: Schema_2): Actions<GDE> {
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
}
