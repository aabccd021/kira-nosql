import { makeImageDraft } from '../../src';

describe('makeImageTrigger', () => {
  describe('onCreate', () => {
    it('does not return action', () => {
      const draft = makeImageDraft({
        colName: 'article',
        fieldName: 'articleImage',
        fieldSpec: { type: 'image' },
      });
      expect(draft.onCreate).toBeUndefined();
    });
  });

  describe('onUpdate', () => {
    it('does not return action', () => {
      const draft = makeImageDraft({
        colName: 'article',
        fieldName: 'articleImage',
        fieldSpec: { type: 'image' },
      });
      expect(draft.onUpdate).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('does not return action', () => {
      const draft = makeImageDraft({
        colName: 'article',
        fieldName: 'articleImage',
        fieldSpec: { type: 'image' },
      });
      expect(draft.onDelete).toBeUndefined();
    });
  });
});
