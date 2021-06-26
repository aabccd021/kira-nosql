import { makeCountTrigger } from '../../src';
import { GetDocParam, GetDocReturn } from '../util';

describe('makeCountTrigger', () => {
  describe('onCreate', () => {
    it('set bookmarkCount to 0 when article created', async () => {
      const trigger = makeCountTrigger({
        colName: 'article',
        fieldName: 'bookmarkCount',
        fieldSpec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onCreate?.['article']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: { id: 'article0', data: {} },
      });

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
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
      const trigger = makeCountTrigger({
        colName: 'article',
        fieldName: 'bookmarkCount',
        fieldSpec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onCreate?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
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

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
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
      const trigger = makeCountTrigger({
        colName: 'article',
        fieldName: 'bookmarkCount',
        fieldSpec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onCreate?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          id: 'bookmark0',
          data: {
            bookmarkedarticle: { type: 'number', value: 0 },
          },
        },
      });

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      });
    });

    it('returns error if counterDoc is empty', async () => {
      const trigger = makeCountTrigger({
        colName: 'article',
        fieldName: 'bookmarkCount',
        fieldSpec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onCreate?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: { id: 'bookmark0', data: {} },
      });

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      });
    });
  });

  describe('onUpdate', () => {
    it('does not return action', () => {
      const trigger = makeCountTrigger({
        colName: 'article',
        fieldName: 'creationTime',
        fieldSpec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      expect(trigger.onUpdate).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('decrease bookmarkCount by 1 if new bookmark added', async () => {
      const trigger = makeCountTrigger({
        colName: 'article',
        fieldName: 'bookmarkCount',
        fieldSpec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onDelete?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
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

      expect(Object.keys(trigger.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
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
      const trigger = makeCountTrigger({
        colName: 'article',
        fieldName: 'bookmarkCount',
        fieldSpec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onDelete?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          id: 'bookmark0',
          data: {
            bookmarkedarticle: { type: 'number', value: 0 },
          },
        },
      });

      expect(Object.keys(trigger.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      });
    });

    it('returns error if counterDoc is empty', async () => {
      const trigger = makeCountTrigger({
        colName: 'article',
        fieldName: 'bookmarkCount',
        fieldSpec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onDelete?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: { id: 'bookmark0', data: {} },
      });

      expect(Object.keys(trigger.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      });
    });
  });
});
