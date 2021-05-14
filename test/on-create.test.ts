import { makeOnCreateTrigger } from '../src/on-create';
import { GetDoc } from '../src/types';

describe('makeOnCreateTrigger', () => {
  describe('count field', () => {
    const onCreateTrigger = makeOnCreateTrigger({
      colName: 'article',
      fieldName: 'bookmarkCount',
      userColName: 'user',
      field: { type: 'count', countedCol: 'bookmark', groupByRef: 'bookmarkedarticle' },
    });
    const articleAction = onCreateTrigger?.['article'];
    const bookmarkAction = onCreateTrigger?.['bookmark'];

    it('only create action for article and bookmark', async () => {
      const actionColNames = Object.keys(onCreateTrigger ?? {});
      expect(actionColNames).toStrictEqual(['article', 'bookmark']);
    });

    it('init count field to 0', async () => {
      const articleActionGetDoc: GetDoc = jest.fn();

      const articleActionResult = await articleAction?.({
        getDoc: articleActionGetDoc,
        snapshot: { id: 'article-0', data: {} },
      });

      expect(articleActionGetDoc).not.toHaveBeenCalled();
      expect(articleActionResult).toStrictEqual({
        tag: 'right',
        value: {
          article: {
            'article-0': { bookmarkCount: 0 },
          },
        },
      });
    });

    it('increase count field when a document added on counted collection', async () => {
      const bookmarkActionGetDoc: GetDoc = jest.fn();

      const bookmarkActionResult = await bookmarkAction?.({
        getDoc: bookmarkActionGetDoc,
        snapshot: {
          id: 'bookmark-0',
          data: {
            bookmarkedarticle: { id: 'article-0' },
          },
        },
      });

      expect(bookmarkActionGetDoc).not.toHaveBeenCalled();
      expect(bookmarkActionResult).toStrictEqual({
        tag: 'right',
        value: {
          article: {
            'article-0': {
              bookmarkCount: { __fieldType: 'increment', value: 1 },
            },
          },
        },
      });
    });

    it('returns error if id is not string', async () => {
      const bookmarkActionGetDoc: GetDoc = jest.fn();

      const bookmarkActionResult = await bookmarkAction?.({
        getDoc: bookmarkActionGetDoc,
        snapshot: {
          id: 'bookmark-0',
          data: { bookmarkedarticle: 0 },
        },
      });

      expect(bookmarkActionGetDoc).not.toHaveBeenCalled();
      expect(bookmarkActionResult).toStrictEqual({
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      });
    });
  });

  describe('creationTime field', () => {
    it('returns creationTime field', async () => {
      const onCreateTrigger = makeOnCreateTrigger({
        colName: 'article',
        fieldName: 'creationTime',
        userColName: 'user',
        field: { type: 'creationTime' },
      });
      const articleAction = onCreateTrigger?.['article'];
      const articleActionGetDoc: GetDoc = jest.fn();

      const articleActionResult = await articleAction?.({
        getDoc: articleActionGetDoc,
        snapshot: { id: 'article-0', data: {} },
      });

      expect(articleActionGetDoc).not.toHaveBeenCalled();
      expect(articleActionResult).toStrictEqual({
        tag: 'right',
        value: {
          article: {
            'article-0': {
              creationTime: { __fieldType: 'creationTime' },
            },
          },
        },
      });
    });
  });

  describe('image field', () => {
    it('does not return action', async () => {
      const onCreateTrigger = makeOnCreateTrigger({
        colName: 'article',
        fieldName: 'creationTime',
        userColName: 'user',
        field: { type: 'image' },
      });
      expect(onCreateTrigger).toBeUndefined();
    });
  });
});
