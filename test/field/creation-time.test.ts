import { CreationTimeField, DocSnapshot } from 'kira-core';
import { Value } from 'trimop';

import { ActionTrigger, getTransactionCommit, getTrigger, UpdateDocCommit } from '../../src';
import { buildDraft, GetDocParam, GetDocReturn } from '../util';

describe('makeCountTimeTrigger', () => {
  describe('onCreate', () => {
    it('create creationTime field when article created', async () => {
      const trigger = getTrigger({
        buildDraft,
        spec: {
          article: {
            creationTime: CreationTimeField(),
          },
        },
      });

      const onCreateTrigger = trigger['article']?.onCreate;
      expect(onCreateTrigger).toBeDefined();

      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();
      const onCreateTransactionCommit = await getTransactionCommit({
        actionTrigger: onCreateTrigger as ActionTrigger<DocSnapshot>,
        getDoc: mockedGetDoc,
        snapshot: { doc: {}, id: 'article0' },
      });

      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(onCreateTransactionCommit).toStrictEqual(
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
      const trigger = getTrigger({
        buildDraft,
        spec: {
          article: {
            creationTime: CreationTimeField(),
          },
        },
      });
      const onUpdateTrigger = trigger['article']?.onUpdate;
      expect(onUpdateTrigger).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('trigger is undefined', () => {
      const trigger = getTrigger({
        buildDraft,
        spec: {
          article: {
            creationTime: CreationTimeField(),
          },
        },
      });

      const onDeleteTrigger = trigger['article']?.onDelete;
      expect(onDeleteTrigger).toBeUndefined();
    });
  });
});
