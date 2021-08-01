import {
  DocSnapshot,
  IncrementField,
  InvalidFieldTypeFailure,
  NumberField,
  RefField,
} from 'kira-core';
import { Failed, Value } from 'trimop';

import {
  ActionTrigger,
  execPropagationOps,
  getTransactionCommit,
  getTrigger,
  UpdateDocCommit,
} from '../../src';
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
          groupByRef: 'bookmarkedarticle',
        },
      },
      bookmark: {},
    },
  });

  describe('onCreate', () => {
    const onCreateArticleTrigger = trigger['article']?.onCreate;
    const onCreateBookmarkTrigger = trigger['bookmark']?.onCreate;

    it('article trigger is defined', () => {
      expect(onCreateArticleTrigger).toBeDefined();
    });

    it('bookmark trigger is defined', () => {
      expect(onCreateBookmarkTrigger).toBeDefined();
    });

    describe('getTransactionCommit', () => {
      it('set bookmarkCount to 0 when article created', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {},
            id: 'article0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateArticleTC).toStrictEqual(
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

      it('increase bookmarkCount if new bookmark added', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateBookmarkTC = await getTransactionCommit({
          actionTrigger: onCreateBookmarkTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedarticle: RefField({ doc: {}, id: 'article0' }),
            },
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateBookmarkTC).toStrictEqual(
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
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateBookmarkTC = await getTransactionCommit({
          actionTrigger: onCreateBookmarkTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedarticle: NumberField(0),
            },
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateBookmarkTC).toStrictEqual(
          Failed(
            InvalidFieldTypeFailure({
              expectedFieldTypes: ['Ref'],
              field: NumberField(0),
            })
          )
        );
      });

      it('returns failure if counterDoc is empty', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateBookmarkTC = await getTransactionCommit({
          actionTrigger: onCreateBookmarkTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {},
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateBookmarkTC).toStrictEqual(
          Failed(
            InvalidFieldTypeFailure({
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
          actionTrigger: onCreateArticleTrigger as ActionTrigger<DocSnapshot>,
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
          actionTrigger: onCreateBookmarkTrigger as ActionTrigger<DocSnapshot>,
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
    const onUpdateArticleTrigger = trigger['article']?.onUpdate;
    const onUpdateBookmarkTrigger = trigger['bookmark']?.onUpdate;

    it('article trigger is undefined', () => {
      expect(onUpdateArticleTrigger).toBeUndefined();
    });

    it('bookmark trigger is undefined', () => {
      expect(onUpdateBookmarkTrigger).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    const onDeleteArticleTrigger = trigger['article']?.onDelete;
    const onDeleteBookmarkTrigger = trigger['bookmark']?.onDelete;

    it('article trigger is undefined', () => {
      expect(onDeleteArticleTrigger).toBeUndefined();
    });

    it('bookmark trigger is defined', () => {
      expect(onDeleteBookmarkTrigger).toBeDefined();
    });

    describe('getTransactionCommit', () => {
      it('decrease bookmarkCount by 1 if new bookmark added', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onDeleteBookmarkTC = await getTransactionCommit({
          actionTrigger: onDeleteBookmarkTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedarticle: RefField({ doc: {}, id: 'article0' }),
            },
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onDeleteBookmarkTC).toStrictEqual(
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

      it('returns failure if counterDoc is not ref field', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onDeleteBookmarkTC = await getTransactionCommit({
          actionTrigger: onDeleteBookmarkTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedarticle: NumberField(0),
            },
            id: 'bookmark0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onDeleteBookmarkTC).toStrictEqual(
          Failed(
            InvalidFieldTypeFailure({
              expectedFieldTypes: ['Ref'],
              field: NumberField(0),
            })
          )
        );
      });

      it('returns failure if counterDoc is empty', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onDeleteBookmarkTC = await getTransactionCommit({
          actionTrigger: onDeleteBookmarkTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: { doc: {}, id: 'bookmark0' },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onDeleteBookmarkTC).toStrictEqual(
          Failed(
            InvalidFieldTypeFailure({
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
          actionTrigger: onDeleteBookmarkTrigger as ActionTrigger<DocSnapshot>,
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
