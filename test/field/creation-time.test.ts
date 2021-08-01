import { CreationTimeField } from 'kira-core';
import { Value } from 'trimop';

import { makeCreationTimeDraft, UpdateDocCommit } from '../../src';
import { GetDocParam, GetDocReturn } from '../util';

describe('makeCountTimeTrigger', () => {
  describe('onCreate', () => {
    it('create creationTime field when article created', async () => {
      const draft = makeCreationTimeDraft({
        context: {
          colName: 'article',
          fieldName: 'creationTime',
        },
        spec: { _type: 'creationTime' },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();

      const actionResult = await draft.onCreate?.['article']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,

        snapshot: { doc: {}, id: 'article0' },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
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
    it('does not return action', () => {
      const draft = makeCreationTimeDraft({
        context: {
          colName: 'article',
          fieldName: 'creationTime',
        },
        spec: { _type: 'creationTime' },
      });
      expect(draft.onUpdate).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('does not return action', () => {
      const draft = makeCreationTimeDraft({
        context: {
          colName: 'article',
          fieldName: 'creationTime',
        },
        spec: { _type: 'creationTime' },
      });
      expect(draft.onDelete).toBeUndefined();
    });
  });
});
