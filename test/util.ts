import { None } from 'trimop';

import {
  BuildDraft,
  DeleteDoc,
  ExecOnRelDocs,
  GetDoc,
  buildCountDraft,
  buildCreationTimeDraft,
  makeRefDraft,
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
    return makeRefDraft({ context, spec });
  }
  return {
    onCreate: None(),
    onDelete: None(),
    onUpdate: None(),
  };
};
