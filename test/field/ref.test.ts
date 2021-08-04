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
      article: {
        articleOwner: {
          _type: 'Ref',
          isOwner: false,
          refedCol: 'user',
          syncedFields: { displayName: true, role: true },
          thisColRefers: [
            // {
            //   colName: 'user',
            //   fields: [
            //     {
            //       name: 'string',
            //       syncedFields: {},
            //     },
            //   ],
            //   thisColRefers: [],
            // },
          ],
        },
      },
      user: {},
    },
  });

  describe('onCreate', () => {
    const onCreateUserTrigger = trigger['user']?.onCreate;
    const onCreateArticleTrigger = trigger['article']?.onCreate;

    it('user trigger is undefined', () => {
      expect(onCreateUserTrigger).toBeUndefined();
    });

    it('article trigger is defined', () => {
      expect(onCreateArticleTrigger).toBeDefined();
    });

    describe('getTransactionCommit', () => {
      it('return failure if refField is empty', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: { doc: {}, id: 'article0' },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateArticleTC).toStrictEqual(
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
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: { articleOwner: StringField('kira') },
            id: 'article0',
          },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateArticleTC).toStrictEqual(
          Failed(
            InvalidFieldTypeFailure({
              expectedFieldTypes: ['Ref'],
              field: StringField('kira'),
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
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              articleOwner: RefField({ doc: {}, id: 'user0' }),
            },
            id: 'article0',
          },
        });

        expect(mockedGetDoc).toHaveBeenCalledTimes(1);
        expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
        expect(onCreateArticleTC).toStrictEqual(
          Failed({
            _failureType: 'GetDocFailure',
            _getDocFailure: 'testGetDocFailure',
          })
        );
      });

      it('copy ref doc field', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
          Value({
            displayName: StringField('Article Zero Title'),
            publishedMedia: StringField('book'),
            role: StringField('Animal'),
          })
        );
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              articleOwner: RefField({ doc: {}, id: 'user0' }),
            },
            id: 'article0',
          },
        });

        expect(mockedGetDoc).toHaveBeenCalledTimes(1);
        expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user0' });
        expect(onCreateArticleTC).toStrictEqual(
          Value({
            article: {
              article0: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  articleOwner: RefUpdateField({
                    displayName: StringField('Article Zero Title'),
                    role: StringField('Animal'),
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
          actionTrigger: onCreateArticleTrigger as ActionTrigger<DocSnapshot>,
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
    const onUpdateUserTrigger = trigger['user']?.onUpdate;
    const onUpdateArticleTrigger = trigger['article']?.onUpdate;

    it('user trigger is defined', () => {
      expect(onUpdateUserTrigger).toBeDefined();
    });

    it('article trigger is undefined', () => {
      expect(onUpdateArticleTrigger).toBeUndefined();
    });

    describe('when doc does not change', () => {
      const userNotChangedSnapshot = {
        after: {
          content: StringField('Its renamed'),
          displayName: StringField('Keyakizaka renamed to Sakurazaka'),
          publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
          readMinute: NumberField(10),
        },
        before: {
          content: StringField('Its renamed'),
          displayName: StringField('Keyakizaka renamed to Sakurazaka'),
          publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
          readMinute: NumberField(10),
        },
        id: 'user0',
      };

      describe('getTransactionCommit', () => {
        it('returns empty transaction commit', async () => {
          const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
          const onUpdateArticleTC = await getTransactionCommit({
            actionTrigger: onUpdateUserTrigger as ActionTrigger<DocChange>,
            getDoc: mockedGetDoc,
            snapshot: userNotChangedSnapshot,
          });
          expect(mockedGetDoc).not.toHaveBeenCalled();
          expect(onUpdateArticleTC).toStrictEqual(Value({}));
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
            actionTrigger: onUpdateUserTrigger as ActionTrigger<DocChange>,
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
          content: StringField('Its renamed sir'),
          displayName: StringField('Keyakizaka46 renamed to Sakurazaka46'),
          publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
          readMinute: NumberField(10),
        },
        before: {
          content: StringField('Its renamed'),
          displayName: StringField('Keyakizaka renamed to Sakurazaka'),
          publishTime: DateField(new Date('2020-09-13T00:00:00Z')),
          readMinute: NumberField(10),
        },
        id: 'user0',
      };

      describe('getTransactionCommit', () => {
        it('returns empty transaction commit', async () => {
          const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
          const onUpdateArticleTC = await getTransactionCommit({
            actionTrigger: onUpdateUserTrigger as ActionTrigger<DocChange>,
            getDoc: mockedGetDoc,
            snapshot: userChangedSnapshot,
          });
          expect(mockedGetDoc).not.toHaveBeenCalled();
          expect(onUpdateArticleTC).toStrictEqual(Value({}));
        });
      });

      describe('execPropagationOps', () => {
        it('copy user fields to referencing articles', async () => {
          const mockedDeleteDoc = jest.fn<DeleteDocReturn, DeleteDocParam>();
          const mockedUpdateDoc = jest.fn<UpdateDocReturn, UpdateDocParam>();
          const mockedExecOnRelDocs = jest
            .fn<ExecOnRelDocsReturn, ExecOnRelDocsParam>()
            .mockImplementation((_, execOnDoc) =>
              Promise.all(['article21', 'article46'].map(execOnDoc))
            );
          await execPropagationOps({
            actionTrigger: onUpdateUserTrigger as ActionTrigger<DocChange>,
            deleteDoc: mockedDeleteDoc,
            execOnRelDocs: mockedExecOnRelDocs,
            snapshot: userChangedSnapshot,
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
          expect(mockedUpdateDoc).toHaveBeenCalledTimes(2);
          expect(mockedUpdateDoc).toHaveBeenNthCalledWith(1, {
            key: { col: 'article', id: 'article21' },
            writeDoc: {
              articleOwner: {
                _type: 'RefUpdate',
                doc: {
                  displayName: { _type: 'String', value: 'Keyakizaka46 renamed to Sakurazaka46' },
                },
              },
            },
          });
          expect(mockedUpdateDoc).toHaveBeenNthCalledWith(2, {
            key: { col: 'article', id: 'article46' },
            writeDoc: {
              articleOwner: {
                _type: 'RefUpdate',
                doc: {
                  displayName: { _type: 'String', value: 'Keyakizaka46 renamed to Sakurazaka46' },
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
    const onDeleteUserTrigger = trigger['user']?.onDelete;
    const onDeleteArticleTrigger = trigger['article']?.onDelete;

    it('user trigger is defined', () => {
      expect(onDeleteUserTrigger).toBeDefined();
    });

    it('article trigger is undefined', () => {
      expect(onDeleteArticleTrigger).toBeUndefined();
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
          actionTrigger: onDeleteUserTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: deleteUserSnapshot,
        });
        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onDeleteUserTC).toStrictEqual(Value({}));
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
          actionTrigger: onDeleteUserTrigger as ActionTrigger<DocSnapshot>,
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
