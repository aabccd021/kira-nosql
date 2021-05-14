import { makeOnCreateTrigger } from '../src/on-create';

describe('makeOnCreateTrigger', () => {
  describe('count field', () => {
    it('returns right value', () => {
      const onCreateTrigger = makeOnCreateTrigger({
        colName: 'post',
        fieldName: 'bookmarkCount',
        userColName: 'user',
        field: { type: 'count', countedCol: 'bookmark', groupByRef: 'bookmarkedPost' },
      });
      const postTrigger = onCreateTrigger['post']
      const bookmarkTrigger = onCreateTrigger['bookmark']

      const postTriggerResult = postTrigger({doc})
    });
  });
});
