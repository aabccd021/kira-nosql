import { makeRefTrigger } from '../../src';
import {
  DeleteDocParam,
  DeleteDocReturn,
  GetDocParam,
  GetDocReturn,
  MergeDocParam,
  MergeDocReturn,
} from '../util';

describe('makeRefTrigger', () => {
  describe('onCreate', () => {
    it('return error if refField is empty', async () => {
      const trigger = makeRefTrigger({
        colName: 'comment',
        fieldName: 'commentedArticle',
        fieldSpec: {
          type: 'ref',
          refedCol: 'article',
          isOwner: false,
          syncFields: { title: true, category: true },
          thisColRefers: [],
        },
      });

      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onCreate?.['comment']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: { id: 'comment0', data: {} },
      });

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      });
    });

    it('return error if refField is not type of ref field', async () => {
      const trigger = makeRefTrigger({
        colName: 'comment',
        fieldName: 'commentedArticle',
        fieldSpec: {
          type: 'ref',
          refedCol: 'article',
          isOwner: false,
          syncFields: { title: true, category: true },
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await trigger.onCreate?.['comment']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: {
          id: 'comment0',
          data: {
            ownerUser: { type: 'string', value: 'somerandomstring' },
          },
        },
      });

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'left',
        error: { errorType: 'invalid_data_type' },
      });
    });

    it('return error if get doc is error', async () => {
      const trigger = makeRefTrigger({
        colName: 'comment',
        fieldName: 'commentedArticle',
        fieldSpec: {
          type: 'ref',
          refedCol: 'article',
          isOwner: false,
          syncFields: { title: true, category: true },
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce({
        tag: 'left',
        error: 'error1',
      });
      const actionResult = await trigger.onCreate?.['comment']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
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

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).toHaveBeenCalledTimes(1);
      expect(mockedGetDoc).toHaveBeenCalledWith({
        key: { col: { type: 'normal', name: 'article' }, id: 'article0' },
      });
      expect(actionResult).toStrictEqual({ tag: 'left', error: 'error1' });
    });

    it('copy ref doc field', async () => {
      const trigger = makeRefTrigger({
        colName: 'comment',
        fieldName: 'commentedArticle',
        fieldSpec: {
          type: 'ref',
          refedCol: 'article',
          syncFields: { title: true, category: true },
          isOwner: false,
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce({
        tag: 'right',
        value: {
          id: 'aricle0',
          data: {
            title: { type: 'string', value: 'Article Zero Title' },
            category: { type: 'string', value: 'Animal' },
            publishedMedia: { type: 'string', value: 'book' },
          },
        },
      });
      const actionResult = await trigger.onCreate?.['comment']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
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

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).toHaveBeenCalledTimes(1);
      expect(mockedGetDoc).toHaveBeenCalledWith({
        key: { col: { type: 'normal', name: 'article' }, id: 'article0' },
      });
      expect(actionResult).toStrictEqual({
        tag: 'right',
        value: {
          comment: {
            comment0: {
              op: 'merge',
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
        },
      });
    });
  });

  // describe('onUpdate', () => {
  //   it('return empty trigger if no comment data changed', async () => {
  //     const trigger = makeRefTrigger({
  //       colName: 'comment',
  //       fieldName: 'commentedArticle',
  //       fieldSpec: {
  //         type: 'ref',
  //         refedCol: 'article',
  //         syncFields: { title: true, readMinute: true },
  //         isOwner: false,
  //         thisColRefers: [],
  //       },
  //     });
  //     const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
  //     const actionResult = await trigger.onUpdate?.['article']?.getTransactionCommit?.({
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
  //     expect(Object.keys(trigger.onUpdate ?? {})).toStrictEqual(['article']);
  //     expect(mockedGetDoc).not.toHaveBeenCalled();
  //     expect(actionResult).toStrictEqual({ tag: 'right', value: {} });
  //   });

  //   it('copy article field', async () => {
  //     const trigger = makeRefTrigger({
  //       colName: 'comment',
  //       fieldName: 'commentedArticle',
  //       fieldSpec: {
  //         type: 'ref',
  //         refedCol: 'article',
  //         syncFields: { title: true, readMinute: true },
  //         isOwner: false,
  //         thisColRefers: [],
  //       },
  //     });
  //     const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
  //     const actionResult = await trigger.onUpdate?.['article']?.getTransactionCommit?.({
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
  //     expect(Object.keys(trigger.onUpdate ?? {})).toStrictEqual(['article']);
  //     expect(mockedGetDoc).not.toHaveBeenCalled();
  //     expect(actionResult).toStrictEqual({
  //       tag: 'right',
  //       value: {
  //         comment: {
  //           comment46: {
  //             op: 'merge',
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
  //             op: 'merge',
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
      const trigger = makeRefTrigger({
        colName: 'comment',
        fieldName: 'commentedArticle',
        fieldSpec: {
          type: 'ref',
          refedCol: 'article',
          syncFields: {},
          isOwner: false,
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce({
        tag: 'right',
        value: {
          id: 'comment-commentedArticle-article-article0',
          data: {
            docIds: {
              type: 'stringArray',
              value: ['comment0', 'comment46'],
            },
          },
        },
      });
      const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
      const mockedMergeDoc = jest.fn<MergeDocReturn, MergeDocParam>();
      await trigger.onDelete?.['article']?.mayFailOp?.({
        getDoc: mockedGetDoc,
        deleteDoc: mockedDeleteDoc,
        mergeDoc: mockedMergeDoc,
        snapshot: {
          id: 'article0',
          data: {
            title: { type: 'string', value: 'ARTICLE ZERO TITLE' },
          },
        },
      });

      expect(Object.keys(trigger.onDelete ?? {})).toStrictEqual(['article']);
      expect(mockedMergeDoc).not.toHaveBeenCalled();
      expect(mockedGetDoc).toHaveBeenCalledTimes(1);
      expect(mockedGetDoc).toHaveBeenCalledWith({
        key: {
          id: 'article0',
          col: {
            type: 'rel',
            referField: 'commentedArticle',
            referCol: 'comment',
            refedCol: 'article',
          },
        },
      });
      expect(mockedDeleteDoc).toHaveBeenCalledTimes(3);
      expect(mockedDeleteDoc).toHaveBeenNthCalledWith(1, {
        key: {
          id: 'article0',
          col: {
            type: 'rel',
            referField: 'commentedArticle',
            referCol: 'comment',
            refedCol: 'article',
          },
        },
      });
      expect(mockedDeleteDoc).toHaveBeenNthCalledWith(2, {
        key: {
          id: 'comment0',
          col: { type: 'normal', name: 'comment' },
        },
      });
      expect(mockedDeleteDoc).toHaveBeenNthCalledWith(3, {
        key: {
          id: 'comment46',
          col: { type: 'normal', name: 'comment' },
        },
      });
    });
  });
});