import { makeCreationTimeTrigger } from '../../src';
import { GetDocParam, GetDocReturn } from '../util';

describe('makeCountTimeTrigger', () => {
  describe('onCreate', () => {
    it('create creationTime field when article created', async () => {
      const trigger = makeCreationTimeTrigger({
        colName: 'article',
        fieldName: 'creationTime',
        fieldSpec: { type: 'creationTime' },
      });
      const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>();

      const actionResult = await trigger.onCreate?.['article']?.getTransactionCommit?.({
        getDoc: mockedGetDoc,
        snapshot: { id: 'article0', data: {} },
      });

      expect(Object.keys(trigger.onCreate ?? {})).toStrictEqual(['article']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual({
        tag: 'right',
        value: {
          article: {
            article0: {
              op: 'merge',
              data: {
                creationTime: { type: 'creationTime' },
              },
            },
          },
        },
      });
    });
  });

  describe('onUpdate', () => {
    it('does not return action', () => {
      const trigger = makeCreationTimeTrigger({
        colName: 'article',
        fieldName: 'creationTime',
        fieldSpec: { type: 'creationTime' },
      });
      expect(trigger.onUpdate).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('does not return action', () => {
      const trigger = makeCreationTimeTrigger({
        colName: 'article',
        fieldName: 'creationTime',
        fieldSpec: { type: 'creationTime' },
      });
      expect(trigger.onDelete).toBeUndefined();
    });
  });
});
