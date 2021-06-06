import { GetDoc, QueryDoc } from '../src';
import {
  makeOnDeleteCountFieldTrigger,
  makeOnDeleteCreationTimeFieldTrigger,
  makeOnDeleteImageFieldTrigger,
  makeOnDeleteOwnerFieldTrigger,
  makeOnDeleteRefFieldTrigger,
  makeOnDeleteStringFieldTrigger,
} from '../src/on-delete';

type QueryReturn = ReturnType<QueryDoc<string>>;
type QueryParam = Parameters<QueryDoc<string>>;
type GetDocReturn = ReturnType<GetDoc<string>>;
type GetDocParam = Parameters<GetDoc<string>>;

describe('count field action maker', () => {
  it('decrease bookmarkCount by 1 if new bookmark added', async () => {
    const OnDeleteTrigger = makeOnDeleteCountFieldTrigger({
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
    const actionResult = await OnDeleteTrigger?.['bookmark']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: { type: 'ref', value: { id: 'article0' } },
        },
      },
    });

    expect(Object.keys(OnDeleteTrigger ?? {})).toStrictEqual(['bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: {
            op: 'merge',
            data: {
              bookmarkCount: { type: 'increment', incrementValue: -1 },
            },
          },
        },
      },
    });
  });

  it('returns error if counterDoc is not ref field', async () => {
    const OnDeleteTrigger = makeOnDeleteCountFieldTrigger({
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
    const actionResult = await OnDeleteTrigger?.['bookmark']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: { type: 'number', value: 0 },
        },
      },
    });

    expect(Object.keys(OnDeleteTrigger ?? {})).toStrictEqual(['bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });

  it('returns error if counterDoc is empty', async () => {
    const onDeleteTrigger = makeOnDeleteCountFieldTrigger({
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
    const actionResult = await onDeleteTrigger?.['bookmark']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'bookmark0' },
    });

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({
      tag: 'left',
      error: { errorType: 'invalid_data_type' },
    });
  });
});

describe('creationTtime field action maker', () => {
  it('does not return action', () => {
    const OnDeleteTrigger = makeOnDeleteCreationTimeFieldTrigger({
      colName: 'article',
      fieldName: 'creationTime',
      field: { type: 'creationTime' },
    });
    expect(OnDeleteTrigger).toBeUndefined();
  });
});

describe('image field action maker', () => {
  it('does not return action', () => {
    const OnDeleteTrigger = makeOnDeleteImageFieldTrigger({
      colName: 'article',
      fieldName: 'articleImage',
      field: { type: 'image' },
    });
    expect(OnDeleteTrigger).toBeUndefined();
  });
});

describe('owner field action maker', () => {
  it('return error if queryDoc is error', async () => {
    const onDeleteTrigger = makeOnDeleteOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: {
        type: 'owner',
        syncFields: { displayName: true, bio: true },
      },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest
      .fn<QueryReturn, QueryParam>()
      .mockReturnValueOnce(Promise.resolve({ tag: 'left', error: 'error1' }));
    const actionResult = await onDeleteTrigger?.['user']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'user0' },
    });

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['user']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).toHaveBeenCalledTimes(1);
    expect(mockedQueryDoc).toHaveBeenCalledWith({
      col: 'article',
      where: {
        field: ['ownerUser', 'id'],
        op: '==',
        value: 'user0',
      },
    });
    expect(actionResult).toStrictEqual({ tag: 'left', error: 'error1' });
  });

  it('delete referencing articleReply doc', async () => {
    const onDeleteTrigger = makeOnDeleteOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: {
        type: 'owner',
        syncFields: { displayName: true, bio: true },
      },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: [{ id: 'article0' }, { id: 'article21' }],
      })
    );
    const actionResult = await onDeleteTrigger?.['user']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'user0' },
    });

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['user']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).toHaveBeenCalledTimes(1);
    expect(mockedQueryDoc).toHaveBeenCalledWith({
      col: 'article',
      where: {
        field: ['ownerUser', 'id'],
        op: '==',
        value: 'user0',
      },
    });
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        article: {
          article0: { op: 'delete' },
          article21: { op: 'delete' },
        },
      },
    });
  });
});

describe('ref field action maker', () => {
  it('return error if queryDoc is error', async () => {
    const onDeleteTrigger = makeOnDeleteRefFieldTrigger({
      colName: 'articleReply',
      fieldName: 'repliedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest
      .fn<QueryReturn, QueryParam>()
      .mockReturnValueOnce(Promise.resolve({ tag: 'left', error: 'error1' }));
    const actionResult = await onDeleteTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
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

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).toHaveBeenCalledTimes(1);
    expect(mockedQueryDoc).toHaveBeenCalledWith({
      col: 'articleReply',
      where: {
        field: ['repliedArticle', 'id'],
        op: '==',
        value: 'articleReply0',
      },
    });
    expect(actionResult).toStrictEqual({ tag: 'left', error: 'error1' });
  });

  it('delete referencing articleReply doc', async () => {
    const onDeleteTrigger = makeOnDeleteRefFieldTrigger({
      colName: 'articleReply',
      fieldName: 'repliedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: [{ id: 'articleReply0' }, { id: 'articleReply46' }],
      })
    );
    const actionResult = await onDeleteTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
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

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).toHaveBeenCalledTimes(1);
    expect(mockedQueryDoc).toHaveBeenCalledWith({
      col: 'articleReply',
      where: {
        field: ['repliedArticle', 'id'],
        op: '==',
        value: 'articleReply0',
      },
    });
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        articleReply: {
          articleReply0: { op: 'delete' },
          articleReply46: { op: 'delete' },
        },
      },
    });
  });
});

describe('string field action maker', () => {
  it('does not return action', () => {
    const OnDeleteTrigger = makeOnDeleteStringFieldTrigger({
      colName: 'article',
      fieldName: 'text',
      field: { type: 'string' },
    });
    expect(OnDeleteTrigger).toBeUndefined();
  });
});
