import { makeCountDraft } from '../../src';
import { GetDocParam, GetDocReturn } from '../util';

describe('makeCountTrigger', () => {
  describe('onCreate', () => {
    it('set bookmarkCount to 0 when article created', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['article']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          type: 'doc',
          doc: {
            id: 'article0',
            data: {},
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'right',
        value: {
          article: {
            article0: {
              op: 'update',
              onDocAbsent: 'doNotUpdate',
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
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          type: 'doc',
          doc: {
            id: 'bookmark0',
            data: {
              bookmarkedarticle: {
                type: 'ref',
                value: { id: 'article0', data: {} },
              },
            },
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'right',
        value: {
          article: {
            article0: {
              op: 'update',
              onDocAbsent: 'doNotUpdate',
              data: {
                bookmarkCount: { type: 'increment', value: 1 },
              },
            },
          },
        },
      });
    });

    it('returns error if counterDoc is not ref field', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          type: 'doc',
          doc: {
            id: 'bookmark0',
            data: {
              bookmarkedarticle: { type: 'number', value: 0 },
            },
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { type: 'InvalidFieldTypeError' },
      });
    });

    it('returns error if counterDoc is empty', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          type: 'doc',
          doc: {
            id: 'bookmark0',
            data: {},
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { type: 'InvalidFieldTypeError' },
      });
    });
  });

  describe('onUpdate', () => {
    it('does not return action', () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'creationTime',
        },
        spec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      expect(draft.onUpdate).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('decrease bookmarkCount by 1 if new bookmark added', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onDelete?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          type: 'doc',
          doc: {
            id: 'bookmark0',
            data: {
              bookmarkedarticle: {
                type: 'ref',
                value: { id: 'article0', data: {} },
              },
            },
          },
        },
      });

      expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'right',
        value: {
          article: {
            article0: {
              op: 'update',
              onDocAbsent: 'doNotUpdate',
              data: {
                bookmarkCount: { type: 'increment', value: -1 },
              },
            },
          },
        },
      });
    });

    it('returns error if counterDoc is not ref field', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onDelete?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          type: 'doc',
          doc: {
            id: 'bookmark0',
            data: {
              bookmarkedarticle: { type: 'number', value: 0 },
            },
          },
        },
      });

      expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { type: 'InvalidFieldTypeError' },
      });
    });

    it('returns error if counterDoc is empty', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onDelete?.['bookmark']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          type: 'doc',
          doc: { id: 'bookmark0', data: {} },
        },
      });

      expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { type: 'InvalidFieldTypeError' },
      });
    });
  });
});
