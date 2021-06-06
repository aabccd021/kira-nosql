import { GetDoc, QueryDoc } from '../src';

export type QueryReturn = ReturnType<QueryDoc<string>>;
export type QueryParam = Parameters<QueryDoc<string>>;
export type GetDocReturn = ReturnType<GetDoc<string>>;
export type GetDocParam = Parameters<GetDoc<string>>;
