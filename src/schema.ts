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
import {
  makeOnDeleteCountFieldTrigger,
  makeOnDeleteCreationTimeFieldTrigger,
  makeOnDeleteImageFieldTrigger,
  makeOnDeleteOwnerFieldTrigger,
  makeOnDeleteRefFieldTrigger,
  makeOnDeleteStringFieldTrigger,
} from './on-delete';
import {
  makeOnUpdateCountFieldTrigger,
  makeOnUpdateCreationTimeFieldTrigger,
  makeOnUpdateImageFieldTrigger,
  makeOnUpdateOwnerFieldTrigger,
  makeOnUpdateRefFieldTrigger,
  makeOnUpdateStringFieldTrigger,
} from './on-update';
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
      onUpdate: ({ schema, field, ...context }) => {
        if (field.type === 'count')
          return makeOnUpdateCountFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'creationTime')
          return makeOnUpdateCreationTimeFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'image')
          return makeOnUpdateImageFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'owner')
          return makeOnUpdateOwnerFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'ref')
          return makeOnUpdateRefFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'string')
          return makeOnUpdateStringFieldTrigger({ ...schema, ...context, field });
        assertNever(field);
      },
      onDelete: ({ schema, field, ...context }) => {
        if (field.type === 'count')
          return makeOnDeleteCountFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'creationTime')
          return makeOnDeleteCreationTimeFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'image')
          return makeOnDeleteImageFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'owner')
          return makeOnDeleteOwnerFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'ref')
          return makeOnDeleteRefFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'string')
          return makeOnDeleteStringFieldTrigger({ ...schema, ...context, field });
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
      onUpdate: ({ schema, field, ...context }) => {
        if (field.type === 'count')
          return makeOnUpdateCountFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'creationTime')
          return makeOnUpdateCreationTimeFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'image')
          return makeOnUpdateImageFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'ref')
          return makeOnUpdateRefFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'string')
          return makeOnUpdateStringFieldTrigger({ ...schema, ...context, field });
        assertNever(field);
      },
      onDelete: ({ schema, field, ...context }) => {
        if (field.type === 'count')
          return makeOnDeleteCountFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'creationTime')
          return makeOnDeleteCreationTimeFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'image')
          return makeOnDeleteImageFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'ref')
          return makeOnDeleteRefFieldTrigger({ ...schema, ...context, field });
        if (field.type === 'string')
          return makeOnDeleteStringFieldTrigger({ ...schema, ...context, field });
        assertNever(field);
      },
    },
  });
}
