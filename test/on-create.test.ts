import { GetDoc } from '../src';
import {
  makeOnCreateCountFieldTrigger,
  makeOnCreateCreationTimeFieldTrigger,
  makeOnCreateImageFieldTrigger,
  makeOnCreateOwnerFieldTrigger,
  makeOnCreateRefFieldTrigger,
  makeOnCreateStringFieldTrigger,
} from '../src/on-create';
import { GetDocParam, GetDocReturn, QueryParam, QueryReturn } from './util';

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
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'article0', data: {} },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: {
            op: 'merge',
            data: {
              bookmarkCount: {
                type: 'number',
                value: 0,
              },
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
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['bookmark']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: {
            type: 'ref',
            value: { id: 'article0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: {
            op: 'merge',
            data: {
              bookmarkCount: { type: 'increment', incrementValue: 1 },
            },
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
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['bookmark']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: { type: 'number', value: 0 },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
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
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['bookmark']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'bookmark0', data: {} },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
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
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();

    const actionResult = await onCreateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'article0', data: {} },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: {
            op: 'merge',
            data: {
              creationTime: { type: 'creationTime' },
            },
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
      fieldName: 'articleImage',
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
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'article0', data: {} },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if refField is not type of ref field', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        data: {
          ownerUser: { type: 'string', value: 'somerandomstring' },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if get doc is error', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'left',
        error: 'error1',
      })
    );
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        data: {
          ownerUser: {
            type: 'ref',
            value: { id: 'user0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'left', error: 'error1' });
  });

  it('return empty trigger if refDoc.value.data is undefined', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: { id: 'user0', data: {} },
      })
    );
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        data: {
          ownerUser: {
            type: 'ref',
            value: { id: 'user0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('return empty trigger syncFields is undefined', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: {
          id: 'user0',
          data: {
            displayName: { type: 'string', value: 'USER 0 NAME' },
          },
        },
      })
    );
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        data: {
          ownerUser: {
            type: 'ref',
            value: { id: 'user0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('copy owner fields', async () => {
    const onCreateTrigger = makeOnCreateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: {
        type: 'owner',
        syncFields: { displayName: true, bio: true },
      },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: {
          id: 'user0',
          data: {
            displayName: { type: 'string', value: 'Kira Masumoto' },
            bio: { type: 'string', value: 'dorokatsu' },
            age: { type: 'number', value: 19 },
          },
        },
      })
    );
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        data: {
          ownerUser: {
            type: 'ref',
            value: { id: 'user0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: {
            op: 'merge',
            data: {
              ownerUser: {
                type: 'ref',
                value: {
                  displayName: { type: 'string', value: 'Kira Masumoto' },
                  bio: { type: 'string', value: 'dorokatsu' },
                },
              },
            },
          },
        },
      },
    });
  });
});

describe('ref field action maker', () => {
  it('return error if refField is empty', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: { type: 'ref', refCol: 'article' },
    });

    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['comment']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'comment0', data: {} },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['comment']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if refField is not type of ref field', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['comment']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'comment0',
        data: {
          ownerUser: { type: 'string', value: 'somerandomstring' },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['comment']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('return error if get doc is error', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'left',
        error: 'error1',
      })
    );
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['comment']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'comment0',
        data: {
          commentedArticle: {
            type: 'ref',
            value: { id: 'article0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['comment']);
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'left', error: 'error1' });
  });

  it('return empty trigger if refDoc.value.data is undefined', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDocReturn: ReturnType<GetDoc<string>> = Promise.resolve({
      tag: 'right',
      value: { id: 'aricle0', data: {} },
    });
    const mockedGetDoc = jest
      .fn<GetDocReturn, GetDocParam>()
      .mockReturnValueOnce(mockedGetDocReturn);
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['comment']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'comment0',
        data: {
          commentedArticle: {
            type: 'ref',
            value: { id: 'article0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['comment']);
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('return empty trigger syncFields is undefined', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: {
          id: 'aricle0',
          data: {
            title: { type: 'string', value: 'ARTICLE ZERO TITLE' },
          },
        },
      })
    );
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['comment']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'comment0',
        data: {
          commentedArticle: {
            type: 'ref',
            value: { id: 'article0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['comment']);
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('copy ref doc field', async () => {
    const onCreateTrigger = makeOnCreateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: {
        type: 'ref',
        refCol: 'article',
        syncFields: { title: true, category: true },
      },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: {
          id: 'aricle0',
          data: {
            title: { type: 'string', value: 'Article Zero Title' },
            category: { type: 'string', value: 'Animal' },
            publishedMedia: { type: 'string', value: 'book' },
          },
        },
      })
    );
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>();
    const actionResult = await onCreateTrigger?.['comment']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'comment0',
        data: {
          commentedArticle: {
            type: 'ref',
            value: { id: 'article0', data: {} },
          },
        },
      },
    });

    expect(Object.keys(onCreateTrigger ?? {})).toStrictEqual(['comment']);
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        comment: {
          comment0: {
            op: 'merge',
            data: {
              commentedArticle: {
                type: 'ref',
                value: {
                  title: { type: 'string', value: 'Article Zero Title' },
                  category: { type: 'string', value: 'Animal' },
                },
              },
            },
          },
        },
      },
    });
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
