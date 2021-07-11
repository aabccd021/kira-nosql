import { DeleteDoc, GetDoc, MergeDoc } from '../src';

export type GetDocReturn = ReturnType<GetDoc<string>>;
export type GetDocParam = Parameters<GetDoc<string>>;
export type MergeDocReturn = ReturnType<MergeDoc<string>>;
export type MergeDocParam = Parameters<MergeDoc<string>>;
export type DeleteDocReturn = ReturnType<DeleteDoc<string>>;
export type DeleteDocParam = Parameters<DeleteDoc<string>>;
