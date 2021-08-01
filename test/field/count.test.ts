import { IncrementField, InvalidFieldTypeFailure, NumberField, RefField } from 'kira-core';
import { Failed, Value } from 'trimop';

import { makeCountDraft, UpdateDocCommit } from '../../src';
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
          _type: 'count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedarticle',
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['article']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          doc: {},
          id: 'article0',
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
        Value({
          article: {
            article0: UpdateDocCommit({
              onDocAbsent: 'doNotUpdate',
              writeDoc: {
                bookmarkCount: NumberField(0),
              },
            }),
          },
        })
      );
    });
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
      getDoc: mockedGetDoc,
      snapshot: {
        doc: {
          bookmarkedarticle: RefField({ doc: {}, id: 'article0' }),
        },
        id: 'bookmark0',
      },
    });

    expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual(
      Value({
        article: {
          article0: UpdateDocCommit({
            onDocAbsent: 'doNotUpdate',
            writeDoc: {
              bookmarkCount: IncrementField(1),
            },
          }),
        },
      })
    );
  });

  it('returns InvalidFieldTypeFailure if counterDoc is not ref field', async () => {
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
      getDoc: mockedGetDoc,
      snapshot: {
        doc: {
          bookmarkedarticle: NumberField(0),
        },
        id: 'bookmark0',
      },
    });

    expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual(
      Failed(
        InvalidFieldTypeFailure({
          expectedFieldTypes: ['ref'],
          field: NumberField(0),
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
      getDoc: mockedGetDoc,
      snapshot: {
        doc: {},
        id: 'bookmark0',
      },
    });

    expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article', 'bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual(
      Failed(
        InvalidFieldTypeFailure({
          expectedFieldTypes: ['ref'],
          field: undefined,
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
      getDoc: mockedGetDoc,
      snapshot: {
        doc: {
          bookmarkedarticle: RefField({ doc: {}, id: 'article0' }),
        },
        id: 'bookmark0',
      },
    });

    expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual(
      Value({
        article: {
          article0: UpdateDocCommit({
            onDocAbsent: 'doNotUpdate',
            writeDoc: {
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
      getDoc: mockedGetDoc,
      snapshot: {
        doc: {
          bookmarkedarticle: NumberField(0),
        },
        id: 'bookmark0',
      },
    });

    expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual(
      Failed(
        InvalidFieldTypeFailure({
          expectedFieldTypes: ['ref'],
          field: NumberField(0),
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
    const actionResult = await draft.onDelete?.['bookmark']?.getTransactionCommit?.({
      getDoc: mockedGetDoc,
      snapshot: { doc: {}, id: 'bookmark0' },
    });

    expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['bookmark']);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(actionResult).toStrictEqual(
      Failed(
        InvalidFieldTypeFailure({
          expectedFieldTypes: ['ref'],
          field: undefined,
        })
      )
    );
  });
});
