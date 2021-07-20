import { makeRefDraft } from '../../src';
import {
  DeleteDocParam,
  DeleteDocReturn,
  GetDocParam,
  GetDocReturn,
  UpdateDocParam,
  UpdateDocReturn,
} from '../util';

describe('makeRefTrigger', () => {
  describe('onCreate', () => {
    it('return error if refField is empty', async () => {
      const draft = makeRefDraft({
        context: {
          colName: 'comment',
          fieldName: 'commentedArticle',
        },
        spec: {
          type: 'ref',
          refedCol: 'article',
          isOwner: false,
          syncedFields: { title: true, category: true },
          thisColRefers: [],
        },
      });

      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['comment']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: { id: 'comment0', data: {} },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { type: 'InvalidFieldTypeError' },
      });
    });

    it('return error if refField is not type of ref field', async () => {
      const draft = makeRefDraft({
        context: {
          colName: 'comment',
          fieldName: 'commentedArticle',
        },
        spec: {
          type: 'ref',
          refedCol: 'article',
          isOwner: false,
          syncedFields: { title: true, category: true },
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['comment']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'comment0',
          data: {
            ownerUser: { type: 'string', value: 'somerandomstring' },
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { type: 'InvalidFieldTypeError' },
      });
    });

    it('return error if get doc is error', async () => {
      const draft = makeRefDraft({
        context: {
          colName: 'comment',
          fieldName: 'commentedArticle',
        },
        spec: {
          type: 'ref',
          refedCol: 'article',
          isOwner: false,
          syncedFields: { title: true, category: true },
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce({
        tag: 'left',
        error: { type: 'GetDocError' },
      });
      const actionResult = await draft.onCreate?.['comment']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'comment0',
          data: {
            commentedArticle: {
              type: 'ref',
              value: { id: 'article0', data: {} },
            },
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).toHaveBeenCalledTimes(1);
      expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
      expect(actionResult).toStrictEqual({ tag: 'left', error: { type: 'GetDocError' } });
    });

    it('copy ref doc field', async () => {
      const draft = makeRefDraft({
        context: {
          colName: 'comment',
          fieldName: 'commentedArticle',
        },
        spec: {
          type: 'ref',
          refedCol: 'article',
          syncedFields: { title: true, category: true },
          isOwner: false,
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce({
        tag: 'right',
        value: {
          title: { type: 'string', value: 'Article Zero Title' },
          category: { type: 'string', value: 'Animal' },
          publishedMedia: { type: 'string', value: 'book' },
        },
      });
      const actionResult = await draft.onCreate?.['comment']?.getTransactionCommit?.({
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: {
          id: 'comment0',
          data: {
            commentedArticle: {
              type: 'ref',
              value: { id: 'article0', data: {} },
            },
          },
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).toHaveBeenCalledTimes(1);
      expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
      expect(actionResult).toStrictEqual({
        tag: 'right',
        value: {
          comment: {
            comment0: {
              op: 'update',
              onDocAbsent: 'doNotUpdate',
              data: {
                commentedArticle: {
                  type: 'ref',
                  value: {
                    title: { type: 'string', value: 'Article Zero Title' },
                    category: { type: 'string', value: 'Animal' },
                  },
                },
              },
            },
          },
          _relation: {
            comment_commentedArticle_article_article0: {
              op: 'update',
              onDocAbsent: 'createDoc',
              data: {
                docIds: {
                  type: 'stringArrayUnion',
                  value: 'comment0',
                },
              },
            },
          },
        },
      });
    });
  });

  // describe('onUpdate', () => {
  //   it('return empty trigger if no comment data changed', async () => {
  //     const draft = makeRefDraft({
  //       colName: 'comment',
  //       fieldName: 'commentedArticle',
  //       spec: {
  //         type: 'ref',
  //         refedCol: 'article',
  //         syncedFields: { title: true, readMinute: true },
  //         isOwner: false,
  //         thisColRefers: [],
  //       },
  //     });
  //     const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
  //     const actionResult = await draft.onUpdate?.['article']?.getTransactionCommit?.({
  //       getDoc: mockedGetDoc,
  //       snapshot: {
  //         id: 'article0',
  //         before: {
  //           title: { type: 'string', value: 'Keyakizaka renamed to Sakurazaka' },
  //           publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
  //           readMinute: { type: 'number', value: 10 },
  //           content: { type: 'string', value: 'Its renamed' },
  //         },
  //         after: {
  //           title: { type: 'string', value: 'Keyakizaka renamed to Sakurazaka' },
  //           publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
  //           readMinute: { type: 'number', value: 10 },
  //           content: { type: 'string', value: 'Its renamed' },
  //         },
  //       },
  //     });
  //     expect(Object.keys(draft.onUpdate ?? {})).toStrictEqual(['article']);
  //     expect(mockedGetDoc).not.toHaveBeenCalled();
  //     expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  //   });

  //   it('copy article field', async () => {
  //     const draft = makeRefDraft({
  //       colName: 'comment',
  //       fieldName: 'commentedArticle',
  //       spec: {
  //         type: 'ref',
  //         refedCol: 'article',
  //         syncedFields: { title: true, readMinute: true },
  //         isOwner: false,
  //         thisColRefers: [],
  //       },
  //     });
  //     const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
  //     const actionResult = await draft.onUpdate?.['article']?.getTransactionCommit?.({
  //       getDoc: mockedGetDoc,
  //       snapshot: {
  //         id: 'article0',
  //         before: {
  //           title: { type: 'string', value: 'Keyakizaka renamed to Sakurazaka' },
  //           publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
  //           readMinute: { type: 'number', value: 10 },
  //           content: { type: 'string', value: 'Its renamed' },
  //         },
  //         after: {
  //           title: { type: 'string', value: 'Keyakizaka46 renamed to Sakurazaka46' },
  //           publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
  //           readMinute: { type: 'number', value: 10 },
  //           content: { type: 'string', value: 'Its renamed sir' },
  //         },
  //       },
  //     });
  //     expect(Object.keys(draft.onUpdate ?? {})).toStrictEqual(['article']);
  //     expect(mockedGetDoc).not.toHaveBeenCalled();
  //     expect(actionResult).toStrictEqual({
  //       tag: 'right',
  //       value: {
  //         comment: {
  //           comment46: {
  //             op: 'update',
  //             runTrigger: true,
  //             data: {
  //               commentedArticle: {
  //                 type: 'ref',
  //                 value: {
  //                   title: { type: 'string', value: 'Keyakizaka46 renamed to Sakurazaka46' },
  //                 },
  //               },
  //             },
  //           },
  //           comment21: {
  //             op: 'update',
  //             runTrigger: true,
  //             data: {
  //               commentedArticle: {
  //                 type: 'ref',
  //                 value: {
  //                   title: { type: 'string', value: 'Keyakizaka46 renamed to Sakurazaka46' },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });
  //   });
  // });

  describe('onDelete', () => {
    it('delete referencer comment doc', async () => {
      const draft = makeRefDraft({
        context: {
          colName: 'comment',
          fieldName: 'commentedArticle',
        },
        spec: {
          type: 'ref',
          refedCol: 'article',
          syncedFields: {},
          isOwner: false,
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce({
        tag: 'right',
        value: {
          docIds: {
            type: 'stringArray',
            value: ['comment0', 'comment46'],
          },
        },
      });
      const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
      const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
      await draft.onDelete?.['article']?.mayFailOp?.({
        db: {
          getDoc: mockedGetDoc,
          deleteDoc: mockedDeleteDoc,
          updateDoc: mockedUpdateDoc,
        },
        snapshot: {
          id: 'article0',
          data: {
            title: { type: 'string', value: 'ARTICLE ZERO TITLE' },
          },
        },
      });

      expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['comment', 'article']);
      expect(mockedUpdateDoc).not.toHaveBeenCalled();
      expect(mockedGetDoc).toHaveBeenCalledTimes(1);
      expect(mockedGetDoc).toHaveBeenCalledWith({
        col: '_relation',
        id: 'comment_commentedArticle_article_article0',
      });
      expect(mockedDeleteDoc).toHaveBeenCalledTimes(3);
      expect(mockedDeleteDoc).toHaveBeenNthCalledWith(1, {
        col: '_relation',
        id: 'comment_commentedArticle_article_article0',
      });
      expect(mockedDeleteDoc).toHaveBeenNthCalledWith(2, { id: 'comment0', col: 'comment' });
      expect(mockedDeleteDoc).toHaveBeenNthCalledWith(3, { id: 'comment46', col: 'comment' });
    });
  });
});
