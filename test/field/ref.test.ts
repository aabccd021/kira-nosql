import {
  DateField,
  DocSnapshot,
  InvalidFieldTypeFailure,
  NumberField,
  RefField,
  RefUpdateField,
  StringField,
} from 'kira-core';
import { Failed, Value } from 'trimop';

import {
  ActionTrigger,
  DocChange,
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

    describe('execPropagationOps', () => {
      it('never run on comment', async () => {
        const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
        const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
        const mockedExecOnRelDocs = jest.fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>();
        await execPropagationOps({
          actionTrigger: onCreateCommentTrigger as ActionTrigger<DocSnapshot>,
          deleteDoc: mockedDeleteDoc,
          execOnRelDocs: mockedExecOnRelDocs,
          snapshot: {
            doc: {
              commentedArticle: RefField({
                doc: {},
                id: 'article0',
              }),
            },
            id: 'comment0',
          },
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
    const onUpdateCommentTrigger = trigger['comment']?.onUpdate;

    it('article trigger is defined', () => {
      expect(onUpdateArticleTrigger).toBeDefined();
    });

    it('comment trigger is undefined', () => {
      expect(onUpdateCommentTrigger).toBeUndefined();
    });

    describe('getTransactionCommit', () => {
      it('returns empty transaction commit', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onUpdateArticleTC = await getTransactionCommit({
          actionTrigger: onUpdateArticleTrigger as ActionTrigger<DocChange>,
          getDoc: mockedGetDoc,
          snapshot: {
            after: {
              content: StringField('Its renamed sir'),
              publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
              readMinute: NumberField(10),
              title: StringField('Keyakizaka46 renamed to Sakurazaka46'),
            },
            before: {
              content: StringField('Its renamed'),
              publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
              readMinute: NumberField(10),
              title: StringField('Keyakizaka renamed to Sakurazaka'),
            },
            id: 'article0',
          },
        });
        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onUpdateArticleTC).toStrictEqual(Value({}));
      });
    });

    describe('execPropagationOps', () => {
      // it('return empty trigger if no comment data changed', async () => {
      //   const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      //   const onUpdateArticleTC = await getTransactionCommit({
      //     actionTrigger: onUpdateArticleTrigger as ActionTrigger<DocChange>,
      //     getDoc: mockedGetDoc,
      //     snapshot: {
      //       after: {
      //         content: StringField('Its renamed'),
      //         publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
      //         readMinute: NumberField(10),
      //         title: StringField('Keyakizaka renamed to Sakurazaka'),
      //       },
      //       before: {
      //         content: StringField('Its renamed'),
      //         publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
      //         readMinute: NumberField(10),
      //         title: StringField('Keyakizaka renamed to Sakurazaka'),
      //       },
      //       id: 'article0',
      //     },
      //   });
      //   expect(mockedGetDoc).not.toHaveBeenCalled();
      //   expect(onUpdateArticleTC).toStrictEqual(Value({}));
      // });
      it('copy article field', async () => {
        const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
        const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
        const mockedExecOnRelDocs = jest
          .fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>()
          .mockImplementation((_, updateDoc) => {
            return updateDoc({ doc: {}, id: '123' });
          });
        await execPropagationOps({
          actionTrigger: onUpdateArticleTrigger as ActionTrigger<DocChange>,
          deleteDoc: mockedDeleteDoc,
          execOnRelDocs: mockedExecOnRelDocs,
          snapshot: {
            after: {
              content: StringField('Its renamed sir'),
              publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
              readMinute: NumberField(10),
              title: StringField('Keyakizaka46 renamed to Sakurazaka46'),
            },
            before: {
              content: StringField('Its renamed'),
              publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
              readMinute: NumberField(10),
              title: StringField('Keyakizaka renamed to Sakurazaka'),
            },
            id: 'article0',
          },
          updateDoc: mockedUpdateDoc,
        });
        // expect(result).toStrictEqual(Value(undefined));

        expect(mockedExecOnRelDocs).toHaveBeenCalled();
        expect(mockedUpdateDoc).toHaveBeenCalled();
        expect(mockedDeleteDoc).not.toHaveBeenCalled();
        // expect(mockedGetDoc).not.toHaveBeenCalled();
        // expect(onUpdateArticleTC).toStrictEqual(
        //   Value({
        //     comment: {
        //       comment21: {
        //         doc: {
        //           commentedArticle: {
        //             type: 'Ref',
        //             value: {
        //               title: StringField('Keyakizaka46 renamed to Sakurazaka46'),
        //             },
        //           },
        //         },
        //         op: 'update',
        //         runTrigger: true,
        //       },
        //       comment46: {
        //         doc: {
        //           commentedArticle: {
        //             type: 'Ref',
        //             value: {
        //               title: StringField('Keyakizaka46 renamed to Sakurazaka46'),
        //             },
        //           },
        //         },
        //         op: 'update',
        //         runTrigger: true,
        //       },
        //     },
        //   })
        // );
      });
    });

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
});
