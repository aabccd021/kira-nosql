import { InvalidFieldTypeFailure, RefField, StringField } from 'kira-core';
import { Failed, Value } from 'trimop';

import { makeRefDraft } from '../../src';
import { GetDocParam, GetDocReturn } from '../util';

describe('makeRefTrigger', () => {
  describe('onCreate', () => {
    it('return error if refField is empty', async () => {
      const draft = makeRefDraft({
        context: {
          colName: 'comment',
          fieldName: 'commentedArticle',
        },
        spec: {
          _type: 'ref',
          isOwner: false,
          refedCol: 'article',
          syncedFields: { category: true, title: true },
          thisColRefers: [],
        },
      });

      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['comment']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,

        snapshot: { doc: {}, id: 'comment0' },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['comment']);
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

    it('return error if refField is not type of ref field', async () => {
      const draft = makeRefDraft({
        context: {
          colName: 'comment',
          fieldName: 'commentedArticle',
        },
        spec: {
          _type: 'ref',
          isOwner: false,
          refedCol: 'article',
          syncedFields: { category: true, title: true },
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const actionResult = await draft.onCreate?.['comment']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,

        snapshot: {
          doc: {
            ownerUser: StringField('somerandomstring'),
          },
          id: 'comment0',
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['comment']);
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

    // it('return error if get doc is error', async () => {
    //   const draft = makeRefDraft({
    //     context: {
    //       colName: 'comment',
    //       fieldName: 'commentedArticle',
    //     },
    //     spec: {
    //       _type: 'ref',
    //       isOwner: false,
    //       refedCol: 'article',
    //       syncedFields: { category: true, title: true },
    //       thisColRefers: [],
    //     },
    //   });
    //   const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
    //     Failed(
    //       GetDocFailure({
    //         colName: 'x',
    //         doc: {},
    //         expectedFieldType: 'stringArray',
    //         fieldName: 'x',
    //       })
    //     )
    //   );
    //   const actionResult = await draft.onCreate?.['comment']?.getTransactionCommit?.({
    //     getDoc: mockedGetDoc,

    //     snapshot: {
    //       doc: {
    //         commentedArticle: RefField({
    //           doc: {},
    //           id: 'article0',
    //         }),
    //       },
    //       id: 'comment0',
    //     },
    //   });

    //   expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['comment']);
    //   expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    //   expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
    //   expect(actionResult).toStrictEqual(
    //     Failed(
    //       GetDocFailure({
    //         colName: 'x',
    //         doc: {},
    //         expectedFieldType: 'stringArray',
    //         fieldName: 'x',
    //       })
    //     )
    //   );
    // });

    it('copy ref doc field', async () => {
      const draft = makeRefDraft({
        context: {
          colName: 'comment',
          fieldName: 'commentedArticle',
        },
        spec: {
          _type: 'ref',
          isOwner: false,
          refedCol: 'article',
          syncedFields: { category: true, title: true },
          thisColRefers: [],
        },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
        Value({
          category: StringField('Animal'),
          publishedMedia: StringField('book'),
          title: StringField('Article Zero Title'),
        })
      );
      // const actionResult =
      await draft.onCreate?.['comment']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,

        snapshot: {
          doc: {
            commentedArticle: RefField({
              doc: {},
              id: 'article0',
            }),
          },
          id: 'comment0',
        },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['comment']);
      expect(mockedGetDoc).toHaveBeenCalledTimes(1);
      expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
      //   expect(actionResult).toStrictEqual(
      //     Value({
      //       _relation: {
      //         comment_commentedArticle_article_article0: UpdateDocCommit({
      //           doc: {
      //             docIds: StringArrayUnionField('comment0'),
      //           },
      //           onDocAbsent: 'createDoc',
      //         }),
      //       },
      //       comment: {
      //         comment0: UpdateDocCommit({
      //           doc: {
      //             commentedArticle: RefWriteField({
      //               category: StringField('Animal'),
      //               title: StringField('Article Zero Title'),
      //             }),
      //           },
      //           onDocAbsent: 'doNotUpdate',
      //         }),
      //       },
      //     })
      //   );
      // });
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
    //           title: StringField('Keyakizaka renamed to Sakurazaka' },
    //           publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
    //           readMinute: { type: 'number', value: 10 },
    //           content: StringField('Its renamed' },
    //         },
    //         after: {
    //           title: StringField('Keyakizaka renamed to Sakurazaka' },
    //           publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
    //           readMinute: { type: 'number', value: 10 },
    //           content: StringField('Its renamed' },
    //         },
    //       },
    //     });
    //     expect(Object.keys(draft.onUpdate ?? {})).toStrictEqual(['article']);
    //     expect(mockedGetDoc).not.toHaveBeenCalled();
    //     expect(actionResult).toStrictEqual({ tag: 'Value(', value: {} });
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
    //           title: StringField('Keyakizaka renamed to Sakurazaka' },
    //           publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
    //           readMinute: { type: 'number', value: 10 },
    //           content: StringField('Its renamed' },
    //         },
    //         after: {
    //           title: StringField('Keyakizaka46 renamed to Sakurazaka46' },
    //           publishTime: { type: 'date', value: new Date(2018, 9, 13, 0, 0, 0, 0) },
    //           readMinute: { type: 'number', value: 10 },
    //           content: StringField('Its renamed sir' },
    //         },
    //       },
    //     });
    //     expect(Object.keys(draft.onUpdate ?? {})).toStrictEqual(['article']);
    //     expect(mockedGetDoc).not.toHaveBeenCalled();
    //     expect(actionResult).toStrictEqual({
    //       tag: 'Value(',
    //       value: {
    //         comment: {
    //           comment46: {
    //             op: 'update',
    //             runTrigger: true,
    //             doc: {
    //               commentedArticle: {
    //                 type: 'ref',
    //                 value: {
    //                   title: StringField('Keyakizaka46 renamed to Sakurazaka46' },
    //                 },
    //               },
    //             },
    //           },
    //           comment21: {
    //             op: 'update',
    //             runTrigger: true,
    //             doc: {
    //               commentedArticle: {
    //                 type: 'ref',
    //                 value: {
    //                   title: StringField('Keyakizaka46 renamed to Sakurazaka46' },
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       },
    //     });
    //   });
    // });

    // describe('onDelete', () => {
    //   it('delete referencer comment doc', async () => {
    //     const draft = makeRefDraft({
    //       context: {
    //         colName: 'comment',
    //         fieldName: 'commentedArticle',
    //       },
    //       spec: {
    //         _type: 'ref',
    //         isOwner: false,
    //         refedCol: 'article',
    //         syncedFields: {},
    //         thisColRefers: [],
    //       },
    //     });
    //     const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
    //       Value({
    //         docIds: StringArrayField(['comment0', 'comment46']),
    //       })
    //     );

    //     const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
    //     const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
    //     await draft.onDelete?.['article']?.mayFailOp?.({
    //       deleteDoc: mockedDeleteDoc,
    //       getDoc: mockedGetDoc,
    //       snapshot: {
    //         doc: {
    //           title: StringField('ARTICLE ZERO TITLE'),
    //         },
    //         id: 'article0',
    //       },
    //       updateDoc: mockedUpdateDoc,
    //     });

    //     expect(Object.keys(draft.onDelete ?? {})).toStrictEqual(['comment', 'article']);
    //     expect(mockedUpdateDoc).not.toHaveBeenCalled();
    //     expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    //     expect(mockedGetDoc).toHaveBeenCalledWith({
    //       col: '_relation',
    //       id: 'comment_commentedArticle_article_article0',
    //     });
    //     expect(mockedDeleteDoc).toHaveBeenCalledTimes(3);
    //     expect(mockedDeleteDoc).toHaveBeenNthCalledWith(1, {
    //       col: '_relation',
    //       id: 'comment_commentedArticle_article_article0',
    //     });
    //     expect(mockedDeleteDoc).toHaveBeenNthCalledWith(2, { col: 'comment', id: 'comment0' });
    //     expect(mockedDeleteDoc).toHaveBeenNthCalledWith(3, { col: 'comment', id: 'comment46' });
    //   });
  });
});
