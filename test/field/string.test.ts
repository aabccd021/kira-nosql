import { makeStringDraft } from '../../src';

describe('makeStringTrigger', () => {
  describe('onCreate', () => {
    it('does not return action', () => {
      const draft = makeStringDraft({
        colName: 'article',
        fieldName: 'text',
        fieldSpec: { type: 'string' },
      });
      expect(draft.onCreate).toBeUndefined();
    });
  });

  describe('onUpdate', () => {
    it('does not return action', () => {
      const draft = makeStringDraft({
        colName: 'article',
        fieldName: 'text',
        fieldSpec: { type: 'string' },
      });
      expect(draft.onUpdate).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('does not return action', () => {
      const draft = makeStringDraft({
        colName: 'article',
        fieldName: 'text',
        fieldSpec: { type: 'string' },
      });
      expect(draft.onDelete).toBeUndefined();
    });
  });
});
