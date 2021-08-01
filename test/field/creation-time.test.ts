import { CreationTimeField, DocSnapshot } from 'kira-core';
import { Value } from 'trimop';

import {
  ActionTrigger,
  execPropagationOps,
  getTransactionCommit,
  getTrigger,
  UpdateDocCommit,
} from '../../src';
import {
  buildDraft,
  DeleteDocParam,
  DeleteDocReturn,
  ExecOnRelDocsParam,
  ExecOnRelDocsReturn,
  GetDocParam,
  GetDocReturn,
  UpdateDocParam,
  UpdateDocReturn,
} from '../util';

describe('CreationTime trigger', () => {
  const trigger = getTrigger({
    buildDraft,
    spec: {
      article: {
        creationTime: {
          _type: 'CreationTime',
        },
      },
    },
  });

  describe('onCreate', () => {
    const onCreateArticleTrigger = trigger['article']?.onCreate;

    it('trigger is defined', () => {
      expect(onCreateArticleTrigger).toBeDefined();
    });

    describe('getTransactionCommit', () => {
      it('create creationTime field when article created', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger as ActionTrigger<DocSnapshot>,
          getDoc: mockedGetDoc,
          snapshot: { doc: {}, id: 'article0' },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateArticleTC).toStrictEqual(
          Value({
            article: {
              article0: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  creationTime: CreationTimeField(),
                },
              }),
            },
          })
        );
      });
    });

    describe('execPropagationOps', () => {
      it('is not run', async () => {
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
    });
  });

  describe('onUpdate', () => {
    it('trigger is undefined', () => {
      const onUpdateArticleTrigger = trigger['article']?.onUpdate;
      expect(onUpdateArticleTrigger).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('trigger is undefined', () => {
      const onDeleteArticleTrigger = trigger['article']?.onDelete;
      expect(onDeleteArticleTrigger).toBeUndefined();
    });
  });
});
