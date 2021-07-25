import {
  CreationTimeField,
  makeCreationTimeDraft,
  Right,
  testSetup,
  testTeardown,
  UpdateDocCommit,
} from '../../src';
import { GetDocParam, GetDocReturn } from '../util';

describe('makeCountTimeTrigger', () => {
  beforeAll(testSetup);
  afterAll(testTeardown);

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
        db: {
          getDoc: mockedGetDoc,
        },
        snapshot: { id: 'article0', data: {} },
      });

      expect(Object.keys(draft.onCreate ?? {})).toStrictEqual(['article']);
      expect(mockedGetDoc).not.toHaveBeenCalled();
      expect(actionResult).toStrictEqual(
        Right({
          article: {
            article0: UpdateDocCommit({
              onDocAbsent: 'doNotUpdate',
              data: {
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
