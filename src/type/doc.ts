import { Doc, DocSnapshot } from 'kira-core';

export type TriggerSnapshot = DocSnapshot | DocChange;

export type DocChange = {
  readonly id: string;
  readonly before: Doc;
  readonly after: Doc;
};
