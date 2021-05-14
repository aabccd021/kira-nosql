import { makeOnCreateTrigger } from '../src/on-create';
import { GetDoc } from '../src/types';

describe('makeOnCreateTrigger', () => {
  describe('count field', () => {
    const onCreateTrigger = makeOnCreateTrigger({
      colName: 'post',
      fieldName: 'bookmarkCount',
      userColName: 'user',
      field: { type: 'count', countedCol: 'bookmark', groupByRef: 'bookmarkedPost' },
    });
    const postTrigger = onCreateTrigger?.['post'];
    const bookmarkTrigger = onCreateTrigger?.['bookmark'];

    it('init count field to 0', async () => {
      const postTriggerGetDoc: GetDoc = jest.fn();
      const postTriggerResult = await postTrigger?.({
        snapshot: { id: 'post-0', data: {} },
        getDoc: postTriggerGetDoc,
      });

      expect(postTriggerGetDoc).not.toHaveBeenCalled();
      expect(postTriggerResult).toStrictEqual({
        tag: 'right',
        value: {
          post: {
            'post-0': {
              bookmarkCount: 0,
            },
          },
        },
      });
    });

    it('increase count field when a document added on counted collection', async () => {
      const bookmarkTriggerGetDoc: GetDoc = jest.fn();
      const bookmarkTriggerResult = await bookmarkTrigger?.({
        snapshot: {
          id: 'bookmark-0',
          data: {
            bookmarkedPost: {
              id: 'post-0',
            },
          },
        },
        getDoc: bookmarkTriggerGetDoc,
      });

      expect(bookmarkTriggerGetDoc).not.toHaveBeenCalled();
      expect(bookmarkTriggerResult).toStrictEqual({
        tag: 'right',
        value: {
          post: {
            'post-0': {
              bookmarkCount: { __fieldType: 'increment', value: 1 },
            },
          },
        },
      });
    });

    it('returns error if id is not string', async () => {
      const bookmarkTriggerGetDoc: GetDoc = jest.fn();
      const bookmarkTriggerResult = await bookmarkTrigger?.({
        snapshot: {
          id: 'bookmark-0',
          data: {
            bookmarkedPost: 0,
          },
        },
        getDoc: bookmarkTriggerGetDoc,
      });

      expect(bookmarkTriggerGetDoc).not.toHaveBeenCalled();
      expect(bookmarkTriggerResult).toStrictEqual({
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      });
    });
  });
});
