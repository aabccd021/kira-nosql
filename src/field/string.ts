import { StringField } from 'kira-core';

import { MakeTriggerContext, Trigger } from '../type';

export function makeStringTrigger<GDE, WR>(_: MakeTriggerContext<StringField>): Trigger<GDE, WR> {
  return {};
}
