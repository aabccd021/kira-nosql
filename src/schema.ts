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

export function schemaToActions_1<GDE, QE>(schema: Schema_1): Actions<GDE, QE> {
  return schemaToTriggerActions({
    schema,
    fieldToTrigger: {
      onCreate: ({ schema, field, ...context }) => {
        if (field.type === 'count')
          return makeOnCreateCountFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'creationTime')
          return makeOnCreateCreationTimeFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'image')
          return makeOnCreateImageFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'owner')
          return makeOnCreateOwnerFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'ref')
          return makeOnCreateRefFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'string')
          return makeOnCreateStringFieldTrigger({ ...schema, ...context, field });
        assertNever(field);
      },
    },
  });
}

export function schemaToActions_2<GDE, QE>(schema: Schema_2): Actions<GDE, QE> {
  return schemaToTriggerActions({
    schema,
    fieldToTrigger: {
      onCreate: ({ schema, field, ...context }) => {
        if (field.type === 'count')
          return makeOnCreateCountFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'creationTime')
          return makeOnCreateCreationTimeFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'image')
          return makeOnCreateImageFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'ref')
          return makeOnCreateRefFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'string')
          return makeOnCreateStringFieldTrigger({ ...schema, ...context, field });
        assertNever(field);
      },
    },
  });
}
