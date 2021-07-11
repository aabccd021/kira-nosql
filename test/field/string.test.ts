import { makeStringTrigger } from '../../src';

describe('makeStringTrigger', () => {
  describe('onCreate', () => {
    it('does not return action', () => {
      const trigger = makeStringTrigger({
        colName: 'article',
        fieldName: 'text',
        fieldSpec: { type: 'string' },
      });
      expect(trigger.onCreate).toBeUndefined();
    });
  });

  describe('onUpdate', () => {
    it('does not return action', () => {
      const trigger = makeStringTrigger({
        colName: 'article',
        fieldName: 'text',
        fieldSpec: { type: 'string' },
      });
      expect(trigger.onUpdate).toBeUndefined();
    });
  });

  describe('onDelete', () => {
    it('does not return action', () => {
      const trigger = makeStringTrigger({
        colName: 'article',
        fieldName: 'text',
        fieldSpec: { type: 'string' },
      });
      expect(trigger.onDelete).toBeUndefined();
    });
  });
});
