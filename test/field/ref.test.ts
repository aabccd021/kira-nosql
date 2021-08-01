import {
  DocSnapshot,
  InvalidFieldTypeFailure,
  RefField,
  RefUpdateField,
  StringField,
} from 'kira-core';
import { Failed, Value } from 'trimop';

import { ActionTrigger, getTransactionCommit, getTrigger, UpdateDocCommit } from '../../src';
import { GetDocParam, GetDocReturn, testBuildDraft } from '../util';

describe('Ref Trigger', () => {
  const trigger = getTrigger({
    buildDraft: testBuildDraft,
    spec: {
      article: {},
      comment: {
        commentedArticle: {
          _type: 'Ref',
          isOwner: false,
          refedCol: 'article',
          syncedFields: { category: true, title: true },
          thisColRefers: [],
        },
      },
    },
  });

  describe('onCreate', () => {
    const onCreateArticleTrigger = trigger['article']?.onCreate;
    const onCreateCommentTrigger = trigger['comment']?.onCreate;

    it('article trigger is undefined', () => {
      expect(onCreateArticleTrigger).toBeUndefined();
    });

    it('comment trigger is defined', () => {
      expect(onCreateCommentTrigger).toBeDefined();
    });

    describe('getTransactionCommit', () => {
      it('return failure if refField is empty', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateCommentTC = await getTransactionCommit({
          actionTrigger: onCreateCommentTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {},
            id: 'comment0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateCommentTC).toStrictEqual(
          Failed(
            InvalidFieldTypeFailure({
              expectedFieldTypes: ['Ref'],
              field: undefined,
            })
          )
        );
      });

      it('return failure if refField is not type of ref field', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateCommentTC = await getTransactionCommit({
          actionTrigger: onCreateCommentTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {},
            id: 'comment0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateCommentTC).toStrictEqual(
          Failed(
            InvalidFieldTypeFailure({
              expectedFieldTypes: ['Ref'],
              field: undefined,
            })
          )
        );
      });

      it('return failure if get doc is failure', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
          Failed({
            _failureType: 'GetDocFailure',
            _getDocFailure: 'testGetDocFailure',
          })
        );
        const onCreateCommentTC = await getTransactionCommit({
          actionTrigger: onCreateCommentTrigger as ActionTrigger<DocSnapshot>,
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

        expect(mockedGetDoc).toHaveBeenCalledTimes(1);
        expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
        expect(onCreateCommentTC).toStrictEqual(
          Failed({
            _failureType: 'GetDocFailure',
            _getDocFailure: 'testGetDocFailure',
          })
        );
      });

      it('copy ref doc field', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
          Value({
            category: StringField('Animal'),
            publishedMedia: StringField('book'),
            title: StringField('Article Zero Title'),
          })
        );
        const onCreateCommentTC = await getTransactionCommit({
          actionTrigger: onCreateCommentTrigger as ActionTrigger<DocSnapshot>,
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

        expect(mockedGetDoc).toHaveBeenCalledTimes(1);
        expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article0' });
        expect(onCreateCommentTC).toStrictEqual(
          Value({
            comment: {
              comment0: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  commentedArticle: RefUpdateField({
                    category: StringField('Animal'),
                    title: StringField('Article Zero Title'),
                  }),
                },
              }),
            },
          })
        );
      });
    });
  });

  // describe('onUpdate', () => {
  //   it('return empty trigger if no comment data changed', async () => {
  //     const draft = makeRefDraft({
  //       colName: 'comment',
  //       fieldName: 'commentedArticle',
  //       spec: {
  //         type: 'Ref',
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
  //         type: 'Ref',
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
  //                 type: 'Ref',
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
  //                 type: 'Ref',
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
  //         _type: 'Ref',
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
