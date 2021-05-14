import { addOne } from '../src';

describe('hello', () => {
  it('world', function () {
    expect(addOne(1)).toEqual(2);
  });
});
