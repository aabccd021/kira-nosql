import { StringField } from 'kira-core';

import { Draft, DraftMakerContext } from '../type';

export function makeStringDraft<GDE, WR>(_: DraftMakerContext<StringField>): Draft<GDE, WR> {
  return {};
}
