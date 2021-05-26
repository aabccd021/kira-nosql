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
  const onCreateTrigger = makeOnCreateCountFieldTrigger({
    colName: 'article',
    fieldName: 'bookmarkCount',
    field: {
      type: 'count',
      countedCol: 'bookmark',
      groupByRef: 'bookmarkedarticle',
    },
  });
  const articleAction = onCreateTrigger?.['article'];
  const bookmarkAction = onCreateTrigger?.['bookmark'];

  it('only create action for article and bookmark', () => {
    const actionColNames = Object.keys(onCreateTrigger ?? {});
    expect(actionColNames).toStrictEqual(['article', 'bookmark']);
  });

  it('set bookmarkCount to 0 when article created', async () => {
    const articleActionGetDoc: GetDoc<unknown> = jest.fn();

    const articleActionResult = await articleAction?.({
      getDoc: articleActionGetDoc,
      snapshot: { id: 'article0', data: {} },
    });

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
    const bookmarkActionGetDoc: GetDoc<unknown> = jest.fn();

    const bookmarkActionResult = await bookmarkAction?.({
      getDoc: bookmarkActionGetDoc,
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: { type: 'ref', value: { id: 'article0' } },
        },
      },
    });

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
    const bookmarkActionGetDoc: GetDoc<unknown> = jest.fn();

    const bookmarkActionResult = await bookmarkAction?.({
      getDoc: bookmarkActionGetDoc,
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: { type: 'number', value: 0 },
        },
      },
    });

    expect(bookmarkActionGetDoc).not.toHaveBeenCalled();
    expect(bookmarkActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('returns error if counterDoc is empty', async () => {
    const bookmarkActionGetDoc: GetDoc<unknown> = jest.fn();

    const bookmarkActionResult = await bookmarkAction?.({
      getDoc: bookmarkActionGetDoc,
      snapshot: { id: 'bookmark0' },
    });

    expect(bookmarkActionGetDoc).not.toHaveBeenCalled();
    expect(bookmarkActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });
});

describe('creationTime field action maker', () => {
  const onCreateTrigger = makeOnCreateCreationTimeFieldTrigger({
    colName: 'article',
    fieldName: 'creationTime',
    field: { type: 'creationTime' },
  });

  it('only create action for article and bookmark', () => {
    const actionColNames = Object.keys(onCreateTrigger ?? {});
    expect(actionColNames).toStrictEqual(['article']);
  });

  it('create creationTime field when article created', async () => {
    const articleAction = onCreateTrigger?.['article'];
    const articleActionGetDoc: GetDoc<unknown> = jest.fn();

    const articleActionResult = await articleAction?.({
      getDoc: articleActionGetDoc,
      snapshot: { id: 'article0', data: {} },
    });

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
  const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
    colName: 'article',
    fieldName: 'owner',
    field: { type: 'owner' },
    userColName: 'user',
  });

  const onCreateArticleTrigger = onCreateTrigger?.['article'];

  it('only create action for article', () => {
    const actionColNames = Object.keys(onCreateTrigger ?? {});
    expect(actionColNames).toStrictEqual(['article']);
  });

  it('return error if refField is empty', async () => {
    const articleActionGetDoc = jest.fn();
    const articleActionResult = await onCreateArticleTrigger?.({
      getDoc: articleActionGetDoc,
      snapshot: { id: 'article0' },
    });

    expect(articleActionGetDoc).not.toHaveBeenCalled();
    expect(articleActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if refField is not type of ref field', async () => {
    const articleActionGetDoc = jest.fn();
    const articleActionResult = await onCreateArticleTrigger?.({
      getDoc: articleActionGetDoc,
      snapshot: {
        id: 'article0',
        data: {
          owner: {
            type: 'string',
            value: 'somerandomstring',
          },
        },
      },
    });

    expect(articleActionGetDoc).not.toHaveBeenCalled();
    expect(articleActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if get doc is error', async () => {
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'left',
      error: 'error1',
    });
    const articleActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleActionResult = await onCreateArticleTrigger?.({
      getDoc: articleActionGetDoc,
      snapshot: {
        id: 'article0',
        data: {
          owner: {
            type: 'ref',
            value: { id: 'user0' },
          },
        },
      },
    });

    expect(articleActionGetDoc).toHaveBeenCalledTimes(1);
    expect(articleActionGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
    expect(articleActionResult).toStrictEqual({ tag: 'left', error: 'error1' });
  });

  it('return empty trigger if refDoc.value.data is undefined', async () => {
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'right',
      value: { id: 'user0' },
    });
    const articleActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleActionResult = await onCreateArticleTrigger?.({
      getDoc: articleActionGetDoc,
      snapshot: {
        id: 'article0',
        data: {
          owner: {
            type: 'ref',
            value: { id: 'user0' },
          },
        },
      },
    });

    expect(articleActionGetDoc).toHaveBeenCalledTimes(1);
    expect(articleActionGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
    expect(articleActionResult).toStrictEqual({ tag: 'right', value: {} });
  });
});

describe('ref field action maker', () => {
  const onCreateTrigger = makeOnCreateRefFieldTrigger({
    colName: 'articleReply',
    fieldName: 'repliedArticle',
    field: { type: 'ref', refCol: 'article' },
  });

  const onCreateArticleReplyTrigger = onCreateTrigger?.['articleReply'];

  it('only create action for articleReply', () => {
    const actionColNames = Object.keys(onCreateTrigger ?? {});
    expect(actionColNames).toStrictEqual(['articleReply']);
  });

  it('return error if refField is empty', async () => {
    const articleReplyActionGetDoc = jest.fn();
    const articleReplyActionResult = await onCreateArticleReplyTrigger?.({
      getDoc: articleReplyActionGetDoc,
      snapshot: { id: 'articleReply0' },
    });

    expect(articleReplyActionGetDoc).not.toHaveBeenCalled();
    expect(articleReplyActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if refField is not type of ref field', async () => {
    const articleReplyActionGetDoc = jest.fn();
    const articleReplyActionResult = await onCreateArticleReplyTrigger?.({
      getDoc: articleReplyActionGetDoc,
      snapshot: {
        id: 'articleReply0',
        data: {
          owner: {
            type: 'string',
            value: 'somerandomstring',
          },
        },
      },
    });

    expect(articleReplyActionGetDoc).not.toHaveBeenCalled();
    expect(articleReplyActionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if get doc is error', async () => {
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'left',
      error: 'error1',
    });
    const articleReplyActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleReplyActionResult = await onCreateArticleReplyTrigger?.({
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

    expect(articleReplyActionGetDoc).toHaveBeenCalledTimes(1);
    expect(articleReplyActionGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    expect(articleReplyActionResult).toStrictEqual({
      tag: 'left',
      error: 'error1',
    });
  });

  it('return empty trigger if refDoc.value.data is undefined', async () => {
    const mockedGetDocReturn: ReturnType<GetDoc<unknown>> = Promise.resolve({
      tag: 'right',
      value: { id: 'aricle0' },
    });
    const articleActionGetDoc = jest.fn().mockReturnValueOnce(mockedGetDocReturn);
    const articleActionResult = await onCreateArticleReplyTrigger?.({
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
