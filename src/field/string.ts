import { StringField } from 'kira-core';

import { Draft, DraftMakerContext } from '../type';

export function makeStringTrigger<GDE, WR>(_: DraftMakerContext<StringField>): Draft<GDE, WR> {
  return {};
}
