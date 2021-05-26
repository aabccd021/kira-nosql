import { GetDoc } from '../src';
import {
  makeOnCreateCountFieldTrigger,
  makeOnCreateCreationTimeFieldTrigger,
  makeOnCreateImageFieldTrigger,
  makeOnCreateOwnerFieldTrigger,
  makeOnCreateRefFieldTrigger,
  makeOnCreateStringFieldTrigger,
} from '../src/on-create';

describe('count field action maker', () => {
  it('set bookmarkCount to 0 when article created', async () => {
    const onCreateTrigger = makeOnCreateCountFieldTrigger({
      colName: 'article',
      fieldName: 'bookmarkCount',
      field: {
        type: 'count',
        countedCol: 'bookmark',
        groupByRef: 'bookmarkedarticle',
      },
    });
    const articleActionGetDoc: GetDoc<unknown> = jest.fn();
    const articleActionResult = await onCreateTrigger?.['article']?.({
      getDoc: articleActionGetDoc,
      snapshot: { id: 'article0', data: {} },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(articleActionGetDoc).not.toHaveBeenCalled();
    expect(articleActionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: {
            bookmarkCount: {
              type: 'number',
              value: 0,
            },
          },
        },
      },
    });
  });

  it('increase bookmarkCount if new bookmark added', async () => {
    const onCreateTrigger = makeOnCreateCountFieldTrigger({
      colName: 'article',
      fieldName: 'bookmarkCount',
      field: {
        type: 'count',
        countedCol: 'bookmark',
        groupByRef: 'bookmarkedarticle',
      },
    });
    const bookmarkActionGetDoc: GetDoc<unknown> = jest.fn();
    const bookmarkActionResult = await onCreateTrigger?.['bookmark']?.({
      getDoc: bookmarkActionGetDoc,
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: { type: 'ref', value: { id: 'article0' } },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(bookmarkActionGetDoc).not.toHaveBeenCalled();
    expect(bookmarkActionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: {
            bookmarkCount: { type: 'increment', incrementValue: 1 },
          },
        },
      },
    });
  });

  it('returns error if counterDoc is not ref field', async () => {
    const onCreateTrigger = makeOnCreateCountFieldTrigger({
      colName: 'article',
      fieldName: 'bookmarkCount',
      field: {
        type: 'count',
        countedCol: 'bookmark',
        groupByRef: 'bookmarkedarticle',
      },
    });
    const bookmarkActionGetDoc: GetDoc<unknown> = jest.fn();
    const bookmarkActionResult = await onCreateTrigger?.['bookmark']?.({
      getDoc: bookmarkActionGetDoc,
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: { type: 'number', value: 0 },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(bookmarkActionGetDoc).not.toHaveBeenCalled();
    expect(bookmarkActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('returns error if counterDoc is empty', async () => {
    const onCreateTrigger = makeOnCreateCountFieldTrigger({
      colName: 'article',
      fieldName: 'bookmarkCount',
      field: {
        type: 'count',
        countedCol: 'bookmark',
        groupByRef: 'bookmarkedarticle',
      },
    });
    const bookmarkActionGetDoc: GetDoc<unknown> = jest.fn();
    const bookmarkActionResult = await onCreateTrigger?.['bookmark']?.({
      getDoc: bookmarkActionGetDoc,
      snapshot: { id: 'bookmark0' },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(bookmarkActionGetDoc).not.toHaveBeenCalled();
    expect(bookmarkActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });
});

describe('creationTime field action maker', () => {
  it('create creationTime field when article created', async () => {
    const onCreateTrigger = makeOnCreateCreationTimeFieldTrigger({
      colName: 'article',
      fieldName: 'creationTime',
      field: { type: 'creationTime' },
    });
    const articleActionGetDoc: GetDoc<unknown> = jest.fn();

    const articleActionResult = await onCreateTrigger?.['article']?.({
      getDoc: articleActionGetDoc,
      snapshot: { id: 'article0', data: {} },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(articleActionGetDoc).not.toHaveBeenCalled();
    expect(articleActionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: {
            creationTime: { type: 'creationTime' },
          },
        },
      },
    });
  });
});

describe('image field action maker', () => {
  it('does not return action', () => {
    const onCreateTrigger = makeOnCreateImageFieldTrigger({
      colName: 'article',
      fieldName: 'creationTime',
      field: { type: 'image' },
    });
    expect(onCreateTrigger).toBeUndefined();
  });
});

describe('owner field action maker', () => {
  it('return error if refField is empty', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
      userColName: 'user',
    });
    const articleActionGetDoc = jest.fn();
    const articleActionResult = await onCreateTrigger?.['article']?.({
      getDoc: articleActionGetDoc,
      snapshot: { id: 'article0' },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(articleActionGetDoc).not.toHaveBeenCalled();
    expect(articleActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if refField is not type of ref field', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
      userColName: 'user',
    });
    const articleActionGetDoc = jest.fn();
    const articleActionResult = await onCreateTrigger?.['article']?.({
      getDoc: articleActionGetDoc,
      snapshot: {
        id: 'article0',
        data: {
          ownerUser: {
            type: 'string',
            value: 'somerandomstring',
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(articleActionGetDoc).not.toHaveBeenCalled();
    expect(articleActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if get doc is error', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
      userColName: 'user',
    });
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'left',
      error: 'error1',
    });
    const articleActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleActionResult = await onCreateTrigger?.['article']?.({
      getDoc: articleActionGetDoc,
      snapshot: {
        id: 'article0',
        data: {
          ownerUser: {
            type: 'ref',
            value: { id: 'user0' },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(articleActionGetDoc).toHaveBeenCalledTimes(1);
    expect(articleActionGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
    expect(articleActionResult).toStrictEqual({ tag: 'left', error: 'error1' });
  });

  it('return empty trigger if refDoc.value.data is undefined', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
      userColName: 'user',
    });
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'right',
      value: { id: 'user0' },
    });
    const articleActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleActionResult = await onCreateTrigger?.['article']?.({
      getDoc: articleActionGetDoc,
      snapshot: {
        id: 'article0',
        data: {
          ownerUser: {
            type: 'ref',
            value: { id: 'user0' },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(articleActionGetDoc).toHaveBeenCalledTimes(1);
    expect(articleActionGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
    expect(articleActionResult).toStrictEqual({ tag: 'right', value: {} });
  });
});

describe('ref field action maker', () => {
  it('return error if refField is empty', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'articleReply',
      fieldName: 'repliedArticle',
      field: { type: 'ref', refCol: 'article' },
    });

    const articleReplyActionGetDoc = jest.fn();
    const articleReplyActionResult = await onCreateTrigger?.['articleReply']?.({
      getDoc: articleReplyActionGetDoc,
      snapshot: { id: 'articleReply0' },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['articleReply']);
    expect(articleReplyActionGetDoc).not.toHaveBeenCalled();
    expect(articleReplyActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if refField is not type of ref field', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'articleReply',
      fieldName: 'repliedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const articleReplyActionGetDoc = jest.fn();
    const articleReplyActionResult = await onCreateTrigger?.['articleReply']?.({
      getDoc: articleReplyActionGetDoc,
      snapshot: {
        id: 'articleReply0',
        data: {
          ownerUser: {
            type: 'string',
            value: 'somerandomstring',
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['articleReply']);
    expect(articleReplyActionGetDoc).not.toHaveBeenCalled();
    expect(articleReplyActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if get doc is error', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'articleReply',
      fieldName: 'repliedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'left',
      error: 'error1',
    });
    const articleReplyActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleReplyActionResult = await onCreateTrigger?.['articleReply']?.({
      getDoc: articleReplyActionGetDoc,
      snapshot: {
        id: 'articleReply0',
        data: {
          repliedArticle: {
            type: 'ref',
            value: { id: 'article0' },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['articleReply']);
    expect(articleReplyActionGetDoc).toHaveBeenCalledTimes(1);
    expect(articleReplyActionGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    expect(articleReplyActionResult).toStrictEqual({
      tag: 'left',
      error: 'error1',
    });
  });

  it('return empty trigger if refDoc.value.data is undefined', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'articleReply',
      fieldName: 'repliedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'right',
      value: { id: 'aricle0' },
    });
    const articleActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleActionResult = await onCreateTrigger?.['articleReply']?.({
      getDoc: articleActionGetDoc,
      snapshot: {
        id: 'articleReply0',
        data: {
          repliedArticle: {
            type: 'ref',
            value: { id: 'article0' },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['articleReply']);
    expect(articleActionGetDoc).toHaveBeenCalledTimes(1);
    expect(articleActionGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    expect(articleActionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('return empty trigger syncFields is empty', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'articleReply',
      fieldName: 'repliedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'right',
      value: {
        id: 'aricle0',
        data: {
          title: { type: 'string', value: 'ARTICLE ZERO TITLE' },
        },
      },
    });
    const articleActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleActionResult = await onCreateTrigger?.['articleReply']?.({
      getDoc: articleActionGetDoc,
      snapshot: {
        id: 'articleReply0',
        data: {
          repliedArticle: {
            type: 'ref',
            value: { id: 'article0' },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['articleReply']);
    expect(articleActionGetDoc).toHaveBeenCalledTimes(1);
    expect(articleActionGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    expect(articleActionResult).toStrictEqual({ tag: 'right', value: {} });
  });
});

describe('string field action maker', () => {
  it('does not return action', () => {
    const onCreateTrigger = makeOnCreateStringFieldTrigger({
      colName: 'article',
      fieldName: 'text',
      field: { type: 'string' },
    });
    expect(onCreateTrigger).toBeUndefined();
  });
});
