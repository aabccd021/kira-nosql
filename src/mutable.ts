/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-let */
let errorStackString: string | undefined;

export function testSetup(): void {
  errorStackString = 'TEST';
}

export function testTeardown(): void {
  errorStackString = undefined;
}

export function getFailureStackString(): string | undefined {
  return errorStackString;
}
