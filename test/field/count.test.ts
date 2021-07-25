import {
  IncrementField,
  InvalidFieldTypeError,
  Left,
  makeCountDraft,
  NumberField,
  RefField,
  Right,
  testSetup,
  testTeardown,
  UpdateDocCommit,
} from '../../src';
import { GetDocParam, GetDocReturn } from '../util';

describe('makeCountTrigger', () => {
  beforeAll(testSetup);
  afterAll(testTeardown);

  describe('onCreate', () => {
    it('set bookmarkCount to 0 when article created', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          _type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['article']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'article0',
          data: {},
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
        Right({
          article: {
            article0: UpdateDocCommit({
              onDocAbsent: 'doNotUpdate',
              data: {
                bookmarkCount: NumberField(0),
              },
            }),
          },
        })
      );
    });

    it('increase bookmarkCount if new bookmark added', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          _type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['bookmark']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'bookmark0',
          data: {
            bookmarkedarticle: RefField({ id: 'article0', data: {} }),
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
        Right({
          article: {
            article0: UpdateDocCommit({
              onDocAbsent: 'doNotUpdate',
              data: {
                bookmarkCount: IncrementField(1),
              },
            }),
          },
        })
      );
    });

    it('returns error if counterDoc is not ref field', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          _type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['bookmark']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'bookmark0',
          data: {
            bookmarkedarticle: NumberField(0),
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
        Left(
          InvalidFieldTypeError({
            colName: 'article',
            doc: {
              bookmarkedarticle: {
                _type: 'number',
                value: 0,
              },
            },
            expectedFieldType: 'ref',
            fieldName: 'bookmarkCount',
          })
        )
      );
    });

    it('returns error if counterDoc is empty', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          _type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['bookmark']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'bookmark0',
          data: {},
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
        Left(
          InvalidFieldTypeError({
            colName: 'article',
            fieldName: 'bookmarkCount',
            expectedFieldType: 'ref',
            doc: {},
          })
        )
      );
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
          _type: 'count',
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
          _type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onDelete?.['bookmark']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'bookmark0',
          data: {
            bookmarkedarticle: RefField({ id: 'article0', data: {} }),
          },
        },
      });

      expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
        Right({
          article: {
            article0: UpdateDocCommit({
              onDocAbsent: 'doNotUpdate',
              data: {
                bookmarkCount: IncrementField(-1),
              },
            }),
          },
        })
      );
    });

    it('returns error if counterDoc is not ref field', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          _type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onDelete?.['bookmark']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'bookmark0',
          data: {
            bookmarkedarticle: NumberField(0),
          },
        },
      });

      expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toMatchObject({
        _tag: 'left',
        error: InvalidFieldTypeError({
          colName: 'article',
          doc: {
            bookmarkedarticle: {
              _type: 'number',
              value: 0,
            },
          },
          expectedFieldType: 'ref',
          fieldName: 'bookmarkCount',
        }),
      });
    });

    it('returns error if counterDoc is empty', async () => {
      const draft = makeCountDraft({
        context: {
          colName: 'article',
          fieldName: 'bookmarkCount',
        },
        spec: {
          _type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onDelete?.['bookmark']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: { id: 'bookmark0', data: {} },
      });

      expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
        Left(
          InvalidFieldTypeError({
            colName: 'article',
            fieldName: 'bookmarkCount',
            expectedFieldType: 'ref',
            doc: {},
          })
        )
      );
    });
  });
});
