import {
  DateField,
  DocSnapshot,
  NumberField,
  RefField,
  RefUpdateField,
  StringField,
} from 'kira-core';
import { isNone, isSome, left, optionFromNullable, right, Some } from 'trimop';

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

describe('Ref Trigger', () => {
  describe('when syncFields defined in spec', () => {
    const trigger = getTrigger({
      buildDraft: testBuildDraft,
      spec: {
        article: {
          articleOwner: {
            _type: 'Ref',
            isOwner: false,
            refedCol: 'user',
            syncedFields: {
              age: true,
              displayName: true,
              role: true,
            },
            thisColRefers: [
              {
                colName: 'comment',
                fields: [
                  {
                    name: 'commentedArticle',
                    syncedFields: {
                      articleOwner: {
                        displayName: true,
                      },
                    },
                  },
                ],
                thisColRefers: [],
              },
            ],
          },
          title: {
            _type: 'String',
          },
        },
        comment: {},
        user: {},
      },
    });

    const articleTrigger = optionFromNullable(trigger['article']) as Some<ColTrigger>;
    const userTrigger = optionFromNullable(trigger['user']) as Some<ColTrigger>;
    const commentTrigger = optionFromNullable(trigger['comment']) as Some<ColTrigger>;

    describe('onCreate', () => {
      const onCreateUserTrigger = userTrigger.value.onCreate as Some<ActionTrigger<DocSnapshot>>;
      const onCreateArticleTrigger = articleTrigger.value.onCreate as Some<
        ActionTrigger<DocSnapshot>
      >;
      const onCreateCommentTrigger = commentTrigger.value.onCreate as Some<
        ActionTrigger<DocSnapshot>
      >;

      it('user trigger is none', () => {
        expect(isNone(onCreateUserTrigger)).toStrictEqual(true);
      });

      it('article trigger is some', () => {
        expect(isSome(onCreateArticleTrigger)).toStrictEqual(true);
      });

      it('comment trigger is none', () => {
        expect(isNone(onCreateCommentTrigger)).toStrictEqual(true);
      });

      describe('getTransactionCommit', () => {
        it('return error if refField is empty', async () => {
          const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
          const onCreateArticleTC = await getTransactionCommit({
            actionTrigger: onCreateArticleTrigger.value,
            getDoc: mockedGetDoc,
            snapshot: { doc: {}, id: 'article0' },
          });

          expect(mockedGetDoc).not.toHaveBeenCalled();
          expect(onCreateArticleTC).toStrictEqual(
            left(
              InvalidFieldTypeError({
                expectedFieldTypes: ['Ref'],
                field: undefined,
              })
            )
          );
        });

        it('return error if refField is not type of ref field', async () => {
          const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
          const onCreateArticleTC = await getTransactionCommit({
            actionTrigger: onCreateArticleTrigger.value,
            getDoc: mockedGetDoc,
            snapshot: {
              doc: { articleOwner: StringField('kira') },
              id: 'article0',
            },
          });

          expect(mockedGetDoc).not.toHaveBeenCalled();
          expect(onCreateArticleTC).toStrictEqual(
            left(
              InvalidFieldTypeError({
                expectedFieldTypes: ['Ref'],
                field: StringField('kira'),
              })
            )
          );
        });

        it('return error if get doc is error', async () => {
          const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
            left({
              _errorType: 'GetDocError',
              _getDocError: 'testGetDocError',
            })
          );
          const onCreateArticleTC = await getTransactionCommit({
            actionTrigger: onCreateArticleTrigger.value,
            getDoc: mockedGetDoc,
            snapshot: {
              doc: {
                articleOwner: RefField({ doc: {}, id: 'user0' }),
                title: StringField('Foo Title'),
              },
              id: 'article0',
            },
          });

          expect(mockedGetDoc).toHaveBeenCalledTimes(1);
          expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
          expect(onCreateArticleTC).toStrictEqual(
            left({
              _errorType: 'GetDocError',
              _getDocError: 'testGetDocError',
            })
          );
        });

        it('copy user fields to article field', async () => {
          const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
            right({
              displayName: StringField('Article Zero Title'),
              publishedMedia: StringField('book'),
              role: StringField('Normal User'),
            })
          );
          const onCreateArticleTC = await getTransactionCommit({
            actionTrigger: onCreateArticleTrigger.value,
            getDoc: mockedGetDoc,
            snapshot: {
              doc: {
                articleOwner: RefField({ doc: {}, id: 'user0' }),
                title: StringField('Foo Title'),
              },
              id: 'article0',
            },
          });

          expect(mockedGetDoc).toHaveBeenCalledTimes(1);
          expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
          expect(onCreateArticleTC).toStrictEqual(
            right({
              article: {
                article0: UpdateDocCommit({
                  onDocAbsent: 'doNotUpdate',
                  writeDoc: {
                    articleOwner: RefUpdateField({
                      displayName: StringField('Article Zero Title'),
                      role: StringField('Normal User'),
                    }),
                  },
                }),
              },
            })
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
            snapshot: {
              doc: {
                articleOwner: RefField({
                  doc: {},
                  id: 'user0',
                }),
              },
              id: 'article0',
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
      const onUpdateUserTrigger = userTrigger.value.onUpdate as Some<ActionTrigger<DocChange>>;
      const onUpdateArticleTrigger = articleTrigger.value.onUpdate as Some<
        ActionTrigger<DocChange>
      >;
      const onUpdateCommentTrigger = commentTrigger.value.onUpdate as Some<
        ActionTrigger<DocChange>
      >;

      it('user trigger is some', () => {
        expect(isSome(onUpdateUserTrigger)).toStrictEqual(true);
      });

      it('article trigger is none', () => {
        expect(isNone(onUpdateArticleTrigger)).toStrictEqual(true);
      });

      it('comment trigger is none', () => {
        expect(isNone(onUpdateCommentTrigger)).toStrictEqual(true);
      });

      describe('when doc does not change', () => {
        const userNotChangedSnapshot = {
          after: {
            age: NumberField(18),
            displayName: StringField('Dorokatsu'),
            publishTime: DateField(new Date('2020-04-13T00:00:00Z')),
            role: StringField('Normal User'),
          },
          before: {
            age: NumberField(18),
            displayName: StringField('Dorokatsu'),
            publishTime: DateField(new Date('2020-04-13T00:00:00Z')),
            role: StringField('Normal User'),
          },
          id: 'user0',
        };

        describe('getTransactionCommit', () => {
          it('returns empty transaction commit', async () => {
            const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
            const onUpdateArticleTC = await getTransactionCommit({
              actionTrigger: onUpdateUserTrigger.value,
              getDoc: mockedGetDoc,
              snapshot: userNotChangedSnapshot,
            });
            expect(mockedGetDoc).not.toHaveBeenCalled();
            expect(onUpdateArticleTC).toStrictEqual(right({}));
          });
        });

        describe('does not run update or delete anything', () => {
          it('copy user field', async () => {
            const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
            const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
            const mockedExecOnRelDocs = jest
              .fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>()
              .mockImplementation((_, execOnDoc) =>
                Promise.all(['article21', 'article46'].map(execOnDoc))
              );
            await execPropagationOps({
              actionTrigger: onUpdateUserTrigger.value,
              deleteDoc: mockedDeleteDoc,
              execOnRelDocs: mockedExecOnRelDocs,
              snapshot: userNotChangedSnapshot,
              updateDoc: mockedUpdateDoc,
            });
            expect(mockedExecOnRelDocs).not.toHaveBeenCalled();
            expect(mockedUpdateDoc).not.toHaveBeenCalled();
            expect(mockedDeleteDoc).not.toHaveBeenCalled();
          });
        });
      });

      describe('when doc changes', () => {
        const userChangedSnapshot = {
          after: {
            age: NumberField(18),
            displayName: StringField('Kira Masumoto'),
            publishTime: DateField(new Date('2020-04-13T00:00:00Z')),
            role: StringField('Super User'),
          },
          before: {
            age: NumberField(18),
            displayName: StringField('Dorokatsu'),
            publishTime: DateField(new Date('2020-04-13T00:00:00Z')),
            role: StringField('Normal User'),
          },
          id: 'user0',
        };

        describe('getTransactionCommit', () => {
          it('returns empty transaction commit', async () => {
            const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
            const onUpdateArticleTC = await getTransactionCommit({
              actionTrigger: onUpdateUserTrigger.value,
              getDoc: mockedGetDoc,
              snapshot: userChangedSnapshot,
            });
            expect(mockedGetDoc).not.toHaveBeenCalled();
            expect(onUpdateArticleTC).toStrictEqual(right({}));
          });
        });

        describe('execPropagationOps', () => {
          it('copy user fields to referencing articles', async () => {
            const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
            const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
            const mockedExecOnRelDocs = jest
              .fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>()
              .mockImplementation(({ refedCol, refedId }, execOnDoc) => {
                if (refedCol === 'user') {
                  return Promise.all(['article21', 'article46'].map(execOnDoc));
                }
                if (refedCol === 'article') {
                  if (refedId === 'article21') {
                    return Promise.all(['comment42'].map(execOnDoc));
                  }
                  if (refedId === 'article46') {
                    return Promise.all(['comment92'].map(execOnDoc));
                  }
                }
                // eslint-disable-next-line functional/no-throw-statement
                throw Error();
              });
            await execPropagationOps({
              actionTrigger: onUpdateUserTrigger.value,
              deleteDoc: mockedDeleteDoc,
              execOnRelDocs: mockedExecOnRelDocs,
              snapshot: userChangedSnapshot,
              updateDoc: mockedUpdateDoc,
            });
            expect(mockedExecOnRelDocs).toHaveBeenCalledTimes(3);
            expect(mockedExecOnRelDocs).toHaveBeenNthCalledWith(
              1,
              {
                refedCol: 'user',
                refedId: 'user0',
                referCol: 'article',
                referField: 'articleOwner',
              },
              expect.any(Function)
            );
            expect(mockedExecOnRelDocs).toHaveBeenNthCalledWith(
              2,
              {
                refedCol: 'article',
                refedId: 'article21',
                referCol: 'comment',
                referField: 'commentedArticle',
              },
              expect.any(Function)
            );
            expect(mockedExecOnRelDocs).toHaveBeenNthCalledWith(
              3,
              {
                refedCol: 'article',
                refedId: 'article46',
                referCol: 'comment',
                referField: 'commentedArticle',
              },
              expect.any(Function)
            );
            expect(mockedUpdateDoc).toHaveBeenCalledTimes(4);
            expect(mockedUpdateDoc).toHaveBeenNthCalledWith(1, {
              key: { col: 'article', id: 'article21' },
              writeDoc: {
                articleOwner: {
                  _type: 'RefUpdate',
                  doc: {
                    displayName: StringField('Kira Masumoto'),
                    role: StringField('Super User'),
                  },
                },
              },
            });
            expect(mockedUpdateDoc).toHaveBeenNthCalledWith(2, {
              key: { col: 'comment', id: 'comment42' },
              writeDoc: {
                commentedArticle: {
                  _type: 'RefUpdate',
                  doc: {
                    articleOwner: RefField({
                      doc: {
                        displayName: StringField('Kira Masumoto'),
                      },
                      id: 'user0',
                    }),
                  },
                },
              },
            });
            expect(mockedUpdateDoc).toHaveBeenNthCalledWith(3, {
              key: { col: 'article', id: 'article46' },
              writeDoc: {
                articleOwner: {
                  _type: 'RefUpdate',
                  doc: {
                    displayName: StringField('Kira Masumoto'),
                    role: StringField('Super User'),
                  },
                },
              },
            });
            expect(mockedUpdateDoc).toHaveBeenNthCalledWith(4, {
              key: { col: 'comment', id: 'comment92' },
              writeDoc: {
                commentedArticle: {
                  _type: 'RefUpdate',
                  doc: {
                    articleOwner: RefField({
                      doc: {
                        displayName: StringField('Kira Masumoto'),
                      },
                      id: 'user0',
                    }),
                  },
                },
              },
            });
            expect(mockedDeleteDoc).not.toHaveBeenCalled();
          });
        });
      });
    });
    describe('onDelete', () => {
      const onDeleteUserTrigger = userTrigger.value.onDelete as Some<ActionTrigger<DocSnapshot>>;
      const onDeleteArticleTrigger = articleTrigger.value.onDelete as Some<
        ActionTrigger<DocSnapshot>
      >;
      const onDeleteCommentTrigger = commentTrigger.value.onDelete as Some<
        ActionTrigger<DocSnapshot>
      >;

      it('user trigger is some', () => {
        expect(isSome(onDeleteUserTrigger)).toStrictEqual(true);
      });

      it('article trigger is none', () => {
        expect(isNone(onDeleteArticleTrigger)).toStrictEqual(true);
      });

      it('comment trigger is none', () => {
        expect(isNone(onDeleteCommentTrigger)).toStrictEqual(true);
      });

      const deleteUserSnapshot = {
        doc: {
          content: StringField('Its renamed sir'),
          displayName: StringField('Keyakizaka46 renamed to Sakurazaka46'),
          publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
          readMinute: NumberField(10),
        },
        id: 'user0',
      };

      describe('getTransactionCommit', () => {
        it('returns empty transaction commit', async () => {
          const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
          const onDeleteUserTC = await getTransactionCommit({
            actionTrigger: onDeleteUserTrigger.value,
            getDoc: mockedGetDoc,
            snapshot: deleteUserSnapshot,
          });
          expect(mockedGetDoc).not.toHaveBeenCalled();
          expect(onDeleteUserTC).toStrictEqual(right({}));
        });
      });

      describe('execPropagationOps', () => {
        it('delete referencing articles', async () => {
          const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
          const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
          const mockedExecOnRelDocs = jest
            .fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>()
            .mockImplementation((_, execOnDoc) =>
              Promise.all(['article21', 'article46'].map(execOnDoc))
            );
          await execPropagationOps({
            actionTrigger: onDeleteUserTrigger.value,
            deleteDoc: mockedDeleteDoc,
            execOnRelDocs: mockedExecOnRelDocs,
            snapshot: deleteUserSnapshot,
            updateDoc: mockedUpdateDoc,
          });
          expect(mockedExecOnRelDocs).toHaveBeenCalledTimes(1);
          expect(mockedExecOnRelDocs).toHaveBeenCalledWith(
            {
              refedCol: 'user',
              refedId: 'user0',
              referCol: 'article',
              referField: 'articleOwner',
            },
            expect.any(Function)
          );
          expect(mockedDeleteDoc).toHaveBeenCalledTimes(2);
          expect(mockedDeleteDoc).toHaveBeenNthCalledWith(1, { col: 'article', id: 'article21' });
          expect(mockedDeleteDoc).toHaveBeenNthCalledWith(2, { col: 'article', id: 'article46' });
          expect(mockedUpdateDoc).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('when syncFields are empty in spec', () => {
    const trigger = getTrigger({
      buildDraft: testBuildDraft,
      spec: {
        article: {
          articleOwner: {
            _type: 'Ref',
            isOwner: false,
            refedCol: 'user',
            syncedFields: {},
            thisColRefers: [],
          },
          title: {
            _type: 'String',
          },
        },
        comment: {},
        user: {},
      },
    });

    const articleTrigger = optionFromNullable(trigger['article']) as Some<ColTrigger>;
    const userTrigger = optionFromNullable(trigger['user']) as Some<ColTrigger>;
    const commentTrigger = optionFromNullable(trigger['comment']) as Some<ColTrigger>;

    describe('onCreate', () => {
      const onCreateUserTrigger = userTrigger.value.onCreate as Some<ActionTrigger<DocSnapshot>>;
      const onCreateArticleTrigger = articleTrigger.value.onCreate as Some<
        ActionTrigger<DocSnapshot>
      >;
      const onCreateCommentTrigger = commentTrigger.value.onCreate as Some<
        ActionTrigger<DocSnapshot>
      >;

      it('user trigger is none', () => {
        expect(isNone(onCreateUserTrigger)).toStrictEqual(true);
      });

      it('article trigger is none', () => {
        expect(isNone(onCreateArticleTrigger)).toStrictEqual(true);
      });

      it('comment trigger is none', () => {
        expect(isNone(onCreateCommentTrigger)).toStrictEqual(true);
      });
    });

    describe('onUpdate', () => {
      const onUpdateUserTrigger = userTrigger.value.onUpdate as Some<ActionTrigger<DocChange>>;
      const onUpdateArticleTrigger = articleTrigger.value.onUpdate as Some<
        ActionTrigger<DocChange>
      >;
      const onUpdateCommentTrigger = commentTrigger.value.onUpdate as Some<
        ActionTrigger<DocChange>
      >;

      it('user trigger is none', () => {
        expect(isNone(onUpdateUserTrigger)).toStrictEqual(true);
      });

      it('article trigger is none', () => {
        expect(isNone(onUpdateArticleTrigger)).toStrictEqual(true);
      });

      it('comment trigger is none', () => {
        expect(isNone(onUpdateCommentTrigger)).toStrictEqual(true);
      });
    });
  });
});
