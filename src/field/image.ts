import { ImageField } from 'kira-core';

import { Draft, DraftMakerContext } from '../type';

export function makeImageDraft<GDE, WR>(_: DraftMakerContext<ImageField>): Draft<GDE, WR> {
  return {};
}
