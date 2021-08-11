import { None } from 'trimop';

import {
  buildCountDraft,
  buildCreationTimeDraft,
  BuildDraft,
  buildRefDraft,
  DeleteDoc,
  ExecOnRelDocs,
  GetDoc,
  UpdateDoc,
} from '../src';

export type GetDocReturn = ReturnType<GetDoc>;
export type GetDocParam = Parameters<GetDoc>;
export type UpdateDocReturn = ReturnType<UpdateDoc>;
export type UpdateDocParam = Parameters<UpdateDoc>;
export type DeleteDocReturn = ReturnType<DeleteDoc>;
export type DeleteDocParam = Parameters<DeleteDoc>;
export type ExecOnRelDocsReturn = ReturnType<ExecOnRelDocs>;
export type ExecOnRelDocsParam = Parameters<ExecOnRelDocs>;

export const testBuildDraft: BuildDraft = ({ context, spec }) => {
  if (spec._type === 'CreationTime') {
    return buildCreationTimeDraft({ context, spec });
  }
  if (spec._type === 'Count') {
    return buildCountDraft({ context, spec });
  }
  if (spec._type === 'Ref') {
    return buildRefDraft({ context, spec });
  }
  return None();
};
