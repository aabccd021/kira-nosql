import { DocSnapshot, IncrementField, NumberField, RefField } from 'kira-core';
import { isNone, isSome, Left, optionFromNullable, Right, Some } from 'trimop';

import {
  ActionTrigger,
  ColTrigger,
  DocChange,
  getTransactionCommit,
  InvalidFieldTypeError,
  UpdateDocCommit,
} from '../../src';
import { execPropagationOps } from '../../src/exec-propagation-ops';
import { getTrigger } from '../../src/get-trigger';
import {
  DeleteDocParam,
  DeleteDocReturn,
  ExecOnRelDocsParam,
  ExecOnRelDocsReturn,
  GetDocParam,
  GetDocReturn,
  testBuildDraft,
  UpdateDocParam,
  UpdateDocReturn,
} from '../util';

describe('Count trigger', () => {
  const trigger = getTrigger({
    buildDraft: testBuildDraft,
    spec: {
      article: {
        bookmarkCount: {
          _type: 'Count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedArticle',
        },
      },
      bookmark: {},
    },
  });

  const articleTrigger = optionFromNullable(trigger['article']) as Some<ColTrigger>;
  const bookmarkTrigger = optionFromNullable(trigger['bookmark']) as Some<ColTrigger>;

  it('article trigger is Some', () => {
    expect(isSome(articleTrigger)).toStrictEqual(true);
  });

  it('bookmark trigger is Some', () => {
    expect(isSome(bookmarkTrigger)).toStrictEqual(true);
  });

  describe('onCreate', () => {
    const onCreateArticleTrigger = articleTrigger.value.onCreate as Some<
      ActionTrigger<DocSnapshot>
    >;

    const onCreateBookmarkTrigger = bookmarkTrigger.value.onCreate as Some<
      ActionTrigger<DocSnapshot>
    >;

    it('article trigger is Some', () => {
      expect(isSome(onCreateArticleTrigger)).toStrictEqual(true);
    });

    it('bookmark trigger is Some', () => {
      expect(isSome(onCreateBookmarkTrigger)).toStrictEqual(true);
    });

    describe('getTransactionCommit', () => {
      it('set bookmarkCount to 0 when article created', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {},
            id: 'article0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateArticleTC).toStrictEqual(
          Right({
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

      it('increase bookmarkCount if new bookmark added', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateBookmarkTC = await getTransactionCommit({
          actionTrigger: onCreateBookmarkTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedArticle: RefField({ doc: {}, id: 'article0' }),
            },
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateBookmarkTC).toStrictEqual(
          Right({
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

      it('returns InvalidFieldTypeError if counterDoc is not ref field', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateBookmarkTC = await getTransactionCommit({
          actionTrigger: onCreateBookmarkTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedArticle: NumberField(0),
            },
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateBookmarkTC).toStrictEqual(
          Left(
            InvalidFieldTypeError({
              expectedFieldTypes: ['Ref'],
              field: NumberField(0),
            })
          )
        );
      });

      it('returns error if counterDoc is empty', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateBookmarkTC = await getTransactionCommit({
          actionTrigger: onCreateBookmarkTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {},
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateBookmarkTC).toStrictEqual(
          Left(
            InvalidFieldTypeError({
              expectedFieldTypes: ['Ref'],
              field: undefined,
            })
          )
        );
      });
    });

    describe('execPropagationOps', () => {
      it('never run on article', async () => {
        const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
        const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
        const mockedExecOnRelDocs = jest.fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>();
        await execPropagationOps({
          actionTrigger: onCreateArticleTrigger.value,
          deleteDoc: mockedDeleteDoc,
          execOnRelDocs: mockedExecOnRelDocs,
          snapshot: { doc: {}, id: 'article0' },
          updateDoc: mockedUpdateDoc,
        });
        expect(mockedDeleteDoc).not.toHaveBeenCalled();
        expect(mockedUpdateDoc).not.toHaveBeenCalled();
        expect(mockedExecOnRelDocs).not.toHaveBeenCalled();
      });

      it('never run on bookmark', async () => {
        const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
        const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
        const mockedExecOnRelDocs = jest.fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>();
        await execPropagationOps({
          actionTrigger: onCreateBookmarkTrigger.value,
          deleteDoc: mockedDeleteDoc,
          execOnRelDocs: mockedExecOnRelDocs,
          snapshot: { doc: {}, id: 'article0' },
          updateDoc: mockedUpdateDoc,
        });
        expect(mockedDeleteDoc).not.toHaveBeenCalled();
        expect(mockedUpdateDoc).not.toHaveBeenCalled();
        expect(mockedExecOnRelDocs).not.toHaveBeenCalled();
      });
    });
  });

  describe('onUpdate', () => {
    const onUpdateArticleTrigger = articleTrigger.value.onUpdate as Some<ActionTrigger<DocChange>>;
    const onUpdateBookmarkTrigger = bookmarkTrigger.value.onUpdate as Some<
      ActionTrigger<DocChange>
    >;

    it('article trigger is None', () => {
      expect(isNone(onUpdateArticleTrigger)).toStrictEqual(true);
    });

    it('bookmark trigger is None', () => {
      expect(isNone(onUpdateBookmarkTrigger)).toStrictEqual(true);
    });
  });

  describe('onDelete', () => {
    const onDeleteArticleTrigger = articleTrigger.value.onDelete as Some<
      ActionTrigger<DocSnapshot>
    >;
    const onDeleteBookmarkTrigger = bookmarkTrigger.value.onDelete as Some<
      ActionTrigger<DocSnapshot>
    >;

    it('article trigger is None', () => {
      expect(isNone(onDeleteArticleTrigger)).toStrictEqual(true);
    });

    it('bookmark trigger is Some', () => {
      expect(isSome(onDeleteBookmarkTrigger)).toStrictEqual(true);
    });

    describe('getTransactionCommit', () => {
      it('decrease bookmarkCount by 1 if new bookmark added', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onDeleteBookmarkTC = await getTransactionCommit({
          actionTrigger: onDeleteBookmarkTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedArticle: RefField({ doc: {}, id: 'article0' }),
            },
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onDeleteBookmarkTC).toStrictEqual(
          Right({
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
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onDeleteBookmarkTC = await getTransactionCommit({
          actionTrigger: onDeleteBookmarkTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedArticle: NumberField(0),
            },
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onDeleteBookmarkTC).toStrictEqual(
          Left(
            InvalidFieldTypeError({
              expectedFieldTypes: ['Ref'],
              field: NumberField(0),
            })
          )
        );
      });

      it('returns error if counterDoc is empty', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onDeleteBookmarkTC = await getTransactionCommit({
          actionTrigger: onDeleteBookmarkTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: { doc: {}, id: 'bookmark0' },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onDeleteBookmarkTC).toStrictEqual(
          Left(
            InvalidFieldTypeError({
              expectedFieldTypes: ['Ref'],
              field: undefined,
            })
          )
        );
      });
    });

    describe('execPropagationOps', () => {
      it('never run on bookmark', async () => {
        const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
        const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
        const mockedExecOnRelDocs = jest.fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>();
        await execPropagationOps({
          actionTrigger: onDeleteBookmarkTrigger.value,
          deleteDoc: mockedDeleteDoc,
          execOnRelDocs: mockedExecOnRelDocs,
          snapshot: { doc: {}, id: 'article0' },
          updateDoc: mockedUpdateDoc,
        });
        expect(mockedDeleteDoc).not.toHaveBeenCalled();
        expect(mockedUpdateDoc).not.toHaveBeenCalled();
        expect(mockedExecOnRelDocs).not.toHaveBeenCalled();
      });
    });
  });
});
