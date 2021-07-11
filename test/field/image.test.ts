import { makeImageTrigger } from '../../src';

describe('makeImageTrigger', () => {
  describe('onCreate', () => {
    it('does not return action', () => {
      const trigger = makeImageTrigger({
        colName: 'article',
        fieldName: 'articleImage',
        fieldSpec: { type: 'image' },
      });
      expect(trigger.onCreate).toBeUndefined();
    });
  });

  describe('onUpdate', () => {
    it('does not return action', () => {
      const trigger = makeImageTrigger({
        colName: 'article',
        fieldName: 'articleImage',
        fieldSpec: { type: 'image' },
      });
      expect(trigger.onUpdate).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('does not return action', () => {
      const trigger = makeImageTrigger({
        colName: 'article',
        fieldName: 'articleImage',
        fieldSpec: { type: 'image' },
      });
      expect(trigger.onDelete).toBeUndefined();
    });
  });
});
