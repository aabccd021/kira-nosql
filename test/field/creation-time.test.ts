import { CreationTimeField, DocSnapshot } from 'kira-core';
import { Value } from 'trimop';

import { ActionTrigger, getTransactionCommit, getTrigger, UpdateDocCommit } from '../../src';
import { buildDraft, GetDocParam, GetDocReturn } from '../util';

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

    it('trigger is defined', async () => {
      expect(onCreateArticleTrigger).toBeDefined();
    });

    // TODO: mayFailOps
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
