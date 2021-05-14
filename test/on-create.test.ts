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
    const articleTrigger = onCreateTrigger?.['article'];
    const bookmarkTrigger = onCreateTrigger?.['bookmark'];

    it('init count field to 0', async () => {
      const articleTriggerGetDoc: GetDoc = jest.fn();

      const articleTriggerResult = await articleTrigger?.({
        getDoc: articleTriggerGetDoc,
        snapshot: { id: 'article-0', data: {} },
      });

      expect(articleTriggerGetDoc).not.toHaveBeenCalled();
      expect(articleTriggerResult).toStrictEqual({
        tag: 'right',
        value: {
          article: {
            'article-0': {
              bookmarkCount: 0,
            },
          },
        },
      });
    });

    it('increase count field when a document added on counted collection', async () => {
      const bookmarkTriggerGetDoc: GetDoc = jest.fn();

      const bookmarkTriggerResult = await bookmarkTrigger?.({
        getDoc: bookmarkTriggerGetDoc,
        snapshot: {
          id: 'bookmark-0',
          data: {
            bookmarkedarticle: {
              id: 'article-0',
            },
          },
        },
      });

      expect(bookmarkTriggerGetDoc).not.toHaveBeenCalled();
      expect(bookmarkTriggerResult).toStrictEqual({
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
      const bookmarkTriggerGetDoc: GetDoc = jest.fn();

      const bookmarkTriggerResult = await bookmarkTrigger?.({
        getDoc: bookmarkTriggerGetDoc,
        snapshot: {
          id: 'bookmark-0',
          data: {
            bookmarkedarticle: 0,
          },
        },
      });

      expect(bookmarkTriggerGetDoc).not.toHaveBeenCalled();
      expect(bookmarkTriggerResult).toStrictEqual({
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
      const articleTrigger = onCreateTrigger?.['article'];
      const articleTriggerGetDoc: GetDoc = jest.fn();

      const articleTriggerResult = await articleTrigger?.({
        getDoc: articleTriggerGetDoc,
        snapshot: {
          id: 'article-0',
          data: {},
        },
      });

      expect(articleTriggerGetDoc).not.toHaveBeenCalled();
      expect(articleTriggerResult).toStrictEqual({
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
      const articleTrigger = onCreateTrigger?.['article'];
      const articleTriggerGetDoc: GetDoc = jest.fn();

      const articleTriggerResult = await articleTrigger?.({
        getDoc: articleTriggerGetDoc,
        snapshot: {
          id: 'article-0',
          data: {},
        },
      });

      expect(articleTriggerGetDoc).not.toHaveBeenCalled();
      expect(articleTriggerResult).toBeUndefined();
    });
  });
});
