import { DeleteDoc, GetDoc, UpdateDoc } from '../src';

export type GetDocReturn = ReturnType<GetDoc<string>>;
export type GetDocParam = Parameters<GetDoc<string>>;
export type UpdateDocReturn = ReturnType<UpdateDoc<string>>;
export type UpdateDocParam = Parameters<UpdateDoc<string>>;
export type DeleteDocReturn = ReturnType<DeleteDoc<string>>;
export type DeleteDocParam = Parameters<DeleteDoc<string>>;
