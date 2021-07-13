import { ImageField } from 'kira-core';

import { Draft, DraftMakerContext } from '../type';

export function makeImageTrigger<GDE, WR>(_: DraftMakerContext<ImageField>): Draft<GDE, WR> {
  return {};
}
