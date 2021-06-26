import { ImageField } from 'kira-core';

import { MakeTriggerContext, Trigger } from '../type';

export function makeImageTrigger<GDE, WR>(_: MakeTriggerContext<ImageField>): Trigger<GDE, WR> {
  return {};
}
