import {
  makeOnUpdateCountFieldTrigger,
  makeOnUpdateCreationTimeFieldTrigger,
  makeOnUpdateImageFieldTrigger,
  makeOnUpdateOwnerFieldTrigger,
  makeOnUpdateRefFieldTrigger,
  makeOnUpdateStringFieldTrigger,
} from '../src/on-update';
import { GetDocParam, GetDocReturn, QueryParam, QueryReturn } from './util';

describe('count field action maker', () => {
  it('does not return action', () => {
    const OnUpdateTrigger = makeOnUpdateCountFieldTrigger({
      colName: 'article',
      fieldName: 'creationTime',
      field: {
        type: 'count',
        countedCol: 'bookmark',
        groupByRef: 'bookmarkedarticle',
      },
    });
    expect(OnUpdateTrigger).toBeUndefined();
  });
});

describe('creationTtime field action maker', () => {
  it('does not return action', () => {
    const OnUpdateTrigger = makeOnUpdateCreationTimeFieldTrigger({
      colName: 'article',
      fieldName: 'creationTime',
      field: { type: 'creationTime' },
    });
    expect(OnUpdateTrigger).toBeUndefined();
  });
});

describe('image field action maker', () => {
  it('does not return action', () => {
    const OnUpdateTrigger = makeOnUpdateImageFieldTrigger({
      colName: 'article',
      fieldName: 'articleImage',
      field: { type: 'image' },
    });
    expect(OnUpdateTrigger).toBeUndefined();
  });
});

describe('owner field action maker', () => {
  it('return empty trigger if syncFields is undefined', async () => {
    const onUpdateTrigger = makeOnUpdateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: { type: 'owner' },
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
    const actionResult = await onUpdateTrigger?.['user']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'user0',
        before: {
          displayName: { type: 'string', value: 'Kira Masumoto' },
          bio: { type: 'string', value: 'dorokatsu' },
          age: { type: 'number', value: 19 },
          groupName: { type: 'string', value: 'keyakizaka46' },
        },
        after: {
          displayName: { type: 'string', value: 'Kirako' },
          bio: { type: 'string', value: 'dorokatsu' },
          age: { type: 'number', value: 19 },
          groupName: { type: 'string', value: 'keyakizaka46' },
        },
      },
    });

    expect(Object.keys(onUpdateTrigger ?? {})).toStrictEqual(['user']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('return empty trigger if no user data changed', async () => {
    const onUpdateTrigger = makeOnUpdateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: {
        type: 'owner',
        syncFields: { displayName: true, age: true },
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
    const actionResult = await onUpdateTrigger?.['user']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'user0',
        before: {
          displayName: { type: 'string', value: 'Kira Masumoto' },
          bio: { type: 'string', value: 'dorokatsu' },
          age: { type: 'number', value: 19 },
          groupName: { type: 'string', value: 'keyakizaka46' },
        },
        after: {
          displayName: { type: 'string', value: 'Kira Masumoto' },
          bio: { type: 'string', value: 'dorokatsu' },
          age: { type: 'number', value: 19 },
          groupName: { type: 'string', value: 'keyakizaka46' },
        },
      },
    });

    expect(Object.keys(onUpdateTrigger ?? {})).toStrictEqual(['user']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('return error if queryDoc error', async () => {
    const onUpdateTrigger = makeOnUpdateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: {
        type: 'owner',
        syncFields: { displayName: true, age: true },
      },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest
      .fn<QueryReturn, QueryParam>()
      .mockReturnValueOnce(Promise.resolve({ tag: 'left', error: 'error1' }));
    const actionResult = await onUpdateTrigger?.['user']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'user0',
        before: {
          displayName: { type: 'string', value: 'Kira Masumoto' },
          bio: { type: 'string', value: 'dorokatsu' },
          age: { type: 'number', value: 19 },
          groupName: { type: 'string', value: 'keyakizaka46' },
        },
        after: {
          displayName: { type: 'string', value: 'Kirako' },
          bio: { type: 'string', value: 'dorokatsu' },
          age: { type: 'number', value: 19 },
          groupName: { type: 'string', value: 'keyakizaka46' },
        },
      },
    });

    expect(Object.keys(onUpdateTrigger ?? {})).toStrictEqual(['user']);
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

  it('copy owner field', async () => {
    const onUpdateTrigger = makeOnUpdateOwnerFieldTrigger({
      colName: 'article',
      fieldName: 'ownerUser',
      field: {
        type: 'owner',
        syncFields: { displayName: true, age: true },
      },
      userCol: 'user',
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: [
          { id: 'article21', data: {} },
          { id: 'article42', data: {} },
        ],
      })
    );
    const actionResult = await onUpdateTrigger?.['user']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'user0',
        before: {
          displayName: { type: 'string', value: 'Kira Masumoto' },
          bio: { type: 'string', value: 'dorokatsu' },
          age: { type: 'number', value: 19 },
          groupName: { type: 'string', value: 'keyakizaka46' },
        },
        after: {
          displayName: { type: 'string', value: 'Kirako' },
          bio: { type: 'string', value: 'dorokatsu' },
          age: { type: 'number', value: 19 },
          groupName: { type: 'string', value: 'sakurazaka46' },
        },
      },
    });

    expect(Object.keys(onUpdateTrigger ?? {})).toStrictEqual(['user']);
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
          article21: {
            op: 'merge',
            runTrigger: true,
            data: {
              ownerUser: {
                type: 'ref',
                value: {
                  displayName: { type: 'string', value: 'Kirako' },
                },
              },
            },
          },
          article42: {
            op: 'merge',
            runTrigger: true,
            data: {
              ownerUser: {
                type: 'ref',
                value: {
                  displayName: { type: 'string', value: 'Kirako' },
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
  it('return empty trigger if syncFields is undefined', async () => {
    const onUpdateTrigger = makeOnUpdateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: { type: 'ref', refCol: 'article' },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: [
          { id: 'comment46', data: {} },
          { id: 'comment21', data: {} },
        ],
      })
    );
    const actionResult = await onUpdateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        before: {
          title: { type: 'string', value: 'Keyakizaka renamed to Sakurazaka' },
          publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
          readMinute: { type: 'number', value: 10 },
          content: { type: 'string', value: 'Its renamed' },
        },
        after: {
          title: { type: 'string', value: 'Keyakizaka46 renamed to Sakurazaka46' },
          publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
          readMinute: { type: 'number', value: 10 },
          content: { type: 'string', value: 'Its renamed' },
        },
      },
    });

    expect(Object.keys(onUpdateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('return empty trigger if no comment data changed', async () => {
    const onUpdateTrigger = makeOnUpdateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: {
        type: 'ref',
        refCol: 'article',
        syncFields: { title: true, readMinute: true },
      },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: [
          { id: 'comment46', data: {} },
          { id: 'comment21', data: {} },
        ],
      })
    );
    const actionResult = await onUpdateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        before: {
          title: { type: 'string', value: 'Keyakizaka renamed to Sakurazaka' },
          publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
          readMinute: { type: 'number', value: 10 },
          content: { type: 'string', value: 'Its renamed' },
        },
        after: {
          title: { type: 'string', value: 'Keyakizaka renamed to Sakurazaka' },
          publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
          readMinute: { type: 'number', value: 10 },
          content: { type: 'string', value: 'Its renamed' },
        },
      },
    });

    expect(Object.keys(onUpdateTrigger ?? {})).toStrictEqual(['article']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedQueryDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  });

  it('return error if queryDoc error', async () => {
    const onUpdateTrigger = makeOnUpdateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: {
        type: 'ref',
        refCol: 'article',

        syncFields: { title: true, readMinute: true },
      },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest
      .fn<QueryReturn, QueryParam>()
      .mockReturnValueOnce(Promise.resolve({ tag: 'left', error: 'error1' }));
    const actionResult = await onUpdateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        before: {
          title: { type: 'string', value: 'Keyakizaka renamed to Sakurazaka' },
          publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
          readMinute: { type: 'number', value: 10 },
          content: { type: 'string', value: 'Its renamed' },
        },
        after: {
          title: { type: 'string', value: 'Keyakizaka46 renamed to Sakurazaka46' },
          publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
          readMinute: { type: 'number', value: 10 },
          content: { type: 'string', value: 'Its renamed' },
        },
      },
    });

    expect(Object.keys(onUpdateTrigger ?? {})).toStrictEqual(['article']);
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

  it('copy article field', async () => {
    const onUpdateTrigger = makeOnUpdateRefFieldTrigger({
      colName: 'comment',
      fieldName: 'commentedArticle',
      field: {
        type: 'ref',
        refCol: 'article',
        syncFields: { title: true, readMinute: true },
      },
    });
    const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
    const mockedQueryDoc = jest.fn<QueryReturn, QueryParam>().mockReturnValueOnce(
      Promise.resolve({
        tag: 'right',
        value: [
          { id: 'comment46', data: {} },
          { id: 'comment21', data: {} },
        ],
      })
    );
    const actionResult = await onUpdateTrigger?.['article']?.({
      getDoc: mockedGetDoc,
      queryDoc: mockedQueryDoc,
      snapshot: {
        id: 'article0',
        before: {
          title: { type: 'string', value: 'Keyakizaka renamed to Sakurazaka' },
          publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
          readMinute: { type: 'number', value: 10 },
          content: { type: 'string', value: 'Its renamed' },
        },
        after: {
          title: { type: 'string', value: 'Keyakizaka46 renamed to Sakurazaka46' },
          publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
          readMinute: { type: 'number', value: 10 },
          content: { type: 'string', value: 'Its renamed sir' },
        },
      },
    });

    expect(Object.keys(onUpdateTrigger ?? {})).toStrictEqual(['article']);
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
          comment46: {
            op: 'merge',
            runTrigger: true,
            data: {
              commentedArticle: {
                type: 'ref',
                value: {
                  title: { type: 'string', value: 'Keyakizaka46 renamed to Sakurazaka46' },
                },
              },
            },
          },
          comment21: {
            op: 'merge',
            runTrigger: true,
            data: {
              commentedArticle: {
                type: 'ref',
                value: {
                  title: { type: 'string', value: 'Keyakizaka46 renamed to Sakurazaka46' },
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
    const OnUpdateTrigger = makeOnUpdateStringFieldTrigger({
      colName: 'article',
      fieldName: 'text',
      field: { type: 'string' },
    });
    expect(OnUpdateTrigger).toBeUndefined();
  });
});
