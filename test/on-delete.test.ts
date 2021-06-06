import {
  makeOnDeleteCountFieldTrigger,
  makeOnDeleteCreationTimeFieldTrigger,
  makeOnDeleteImageFieldTrigger,
  makeOnDeleteOwnerFieldTrigger,
  makeOnDeleteRefFieldTrigger,
  makeOnDeleteStringFieldTrigger,
} from '../src/on-delete';
import { GetDocParam, GetDocReturn, QueryParam, QueryReturn } from './util';

describe('count field action maker', () => {
  it('decrease bookmarkCount by 1 if new bookmark added', async () => {
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

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['bookmark']);
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
      snapshot: {
        id: 'bookmark0',
        data: {
          bookmarkedarticle: { type: 'number', value: 0 },
        },
      },
    });

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['bookmark']);
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
      snapshot: { id: 'bookmark0', data: {} },
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
    const onDeleteTrigger = makeOnDeleteCreationTimeFieldTrigger({
      colName: 'article',
      fieldName: 'creationTime',
      field: { type: 'creationTime' },
    });
    expect(onDeleteTrigger).toBeUndefined();
  });
});

describe('image field action maker', () => {
  it('does not return action', () => {
    const onDeleteTrigger = makeOnDeleteImageFieldTrigger({
      colName: 'article',
      fieldName: 'articleImage',
      field: { type: 'image' },
    });
    expect(onDeleteTrigger).toBeUndefined();
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
      snapshot: { id: 'user0', data: {} },
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

  it('delete referencer comment doc', async () => {
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
        value: [
          { id: 'article0', data: {} },
          { id: 'article21', data: {} },
        ],
      })
    );
    const actionResult = await onDeleteTrigger?.['user']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: { id: 'user0', data: {} },
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
      colName: 'comment',
      fieldName: 'commentedArticle',
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
        id: 'article0',
        data: {
          title: { type: 'string', value: 'ARTICLE ZERO TITLE' },
        },
      },
    });

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).toHaveBeenCalledTimes(1);
    expect(mockedQueryDoc).toHaveBeenCalledWith({
      col: 'comment',
      where: {
        field: ['commentedArticle', 'id'],
        op: '==',
        value: 'article0',
      },
    });
    expect(actionResult).toStrictEqual({ tag: 'left', error: 'error1' });
  });

  it('delete referencer comment doc', async () => {
    const onDeleteTrigger = makeOnDeleteRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: [
          { id: 'comment0', data: {} },
          { id: 'comment46', data: {} },
        ],
      })
    );
    const actionResult = await onDeleteTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        data: {
          title: { type: 'string', value: 'ARTICLE ZERO TITLE' },
        },
      },
    });

    expect(Object.keys(onDeleteTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).toHaveBeenCalledTimes(1);
    expect(mockedQueryDoc).toHaveBeenCalledWith({
      col: 'comment',
      where: {
        field: ['commentedArticle', 'id'],
        op: '==',
        value: 'article0',
      },
    });
    expect(actionResult).toStrictEqual({
      tag: 'right',
      value: {
        comment: {
          comment0: { op: 'delete' },
          comment46: { op: 'delete' },
        },
      },
    });
  });
});

describe('string field action maker', () => {
  it('does not return action', () => {
    const onDeleteTrigger = makeOnDeleteStringFieldTrigger({
      colName: 'article',
      fieldName: 'text',
      field: { type: 'string' },
    });
    expect(onDeleteTrigger).toBeUndefined();
  });
});
