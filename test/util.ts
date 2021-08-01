import {
  BuildDraft,
  DeleteDoc,
  ExecOnRelDocs,
  GetDoc,
  makeCountDraft,
  makeCreationTimeDraft,
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

export const buildDraft: BuildDraft = ({ context, spec }) => {
  if (spec._type === 'CreationTime') {
    return makeCreationTimeDraft({ context, spec });
  }
  if (spec._type === 'Count') {
    return makeCountDraft({ context, spec });
  }
  if (spec._type === 'Ref') {
    return makeRefDraft({ context, spec });
  }
  return {};
};
