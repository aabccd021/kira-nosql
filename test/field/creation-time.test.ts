import { CreationTimeField, DocSnapshot } from 'kira-core';
import { isNone, isSome, optionFromNullable, Right, Some } from 'trimop';

import {
  ActionTrigger,
  ColTrigger,
  DocChange,
  getTransactionCommit,
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

describe('CreationTime trigger', () => {
  const trigger = getTrigger({
    buildDraft: testBuildDraft,
    spec: {
      article: {
        creationTime: {
          _type: 'CreationTime',
        },
      },
    },
  });

  const articleTrigger = optionFromNullable(trigger['article']) as Some<ColTrigger>;

  it('article trigger is Some', () => {
    expect(isSome(articleTrigger)).toStrictEqual(true);
  });

  describe('onCreate', () => {
    const onCreateArticleTrigger = articleTrigger.value.onCreate as Some<
      ActionTrigger<DocSnapshot>
    >;

    it('trigger is Some', () => {
      expect(isSome(onCreateArticleTrigger)).toStrictEqual(true);
    });

    describe('getTransactionCommit', () => {
      it('create creationTime field when article created', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: { doc: {}, id: 'article0' },
        });

        expect(mockedGetDoc).not.toHaveBeenCalled();
        expect(onCreateArticleTC).toStrictEqual(
          Right({
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
    });
  });

  describe('onUpdate', () => {
    it('trigger is None', () => {
      const onUpdateArticleTrigger = articleTrigger.value.onUpdate as Some<
        ActionTrigger<DocChange>
      >;
      expect(isNone(onUpdateArticleTrigger)).toStrictEqual(true);
    });
  });

  describe('onDelete', () => {
    it('trigger is None', () => {
      const onDeleteArticleTrigger = articleTrigger.value.onDelete as Some<
        ActionTrigger<DocSnapshot>
      >;
      expect(isNone(onDeleteArticleTrigger)).toStrictEqual(true);
    });
  });
});
