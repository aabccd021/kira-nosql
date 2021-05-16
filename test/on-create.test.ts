import { GetDoc } from '../src';
import {
  makeOnCreateCountFieldTrigger,
  makeOnCreateCreationTimeFieldTrigger,
  makeOnCreateImageFieldTrigger,
} from '../src/on-create';

describe('makeOnCreateCountFieldTrigger', () => {
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

  it('returns error if not ref field', async () => {
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
