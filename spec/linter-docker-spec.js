'use babel';

import { join } from 'path';
// eslint-disable-next-line no-unused-vars
import { it, fit, wait, beforeEach, afterEach } from 'jasmine-fix';

const fixturePath = join(__dirname, 'fixtures');
const goodPath = join(fixturePath, 'good', 'Dockerfile');
const badPath = join(fixturePath, 'bad', 'Dockerfile');
const badNoFromPath = join(fixturePath, 'bad-no-from', 'Dockerfile');
const badRepeatedCMDPath = join(fixturePath, 'bad-repeated-cmd', 'Dockerfile');
const emptyPath = join(fixturePath, 'empty', 'Dockerfile');

describe('The docker provider for Linter', () => {
  const lint = require('../lib/init').provideLinter().lint;

  beforeEach(async () => {
    // Info about this beforeEach() implementation:
    // https://github.com/AtomLinter/Meta/issues/15
    const activationPromise = atom.packages.activatePackage('linter-docker');

    // await atom.packages.activatePackage('language-python');

    atom.packages.triggerDeferredActivationHooks();
    await activationPromise;
  });

  it('should be in the packages list', () =>
    expect(atom.packages.isPackageLoaded('linter-docker')).toBe(true),
  );

  it('should be an active package', () =>
    expect(atom.packages.isPackageActive('linter-docker')).toBe(true),
  );

  it('finds nothing wrong with a valid file', async () => {
    const editor = await atom.workspace.open(goodPath);
    const messages = await lint(editor);
    expect(messages.length).toBe(0);
  });

  it('shows errors in an a file with issues', async () => {
    const editor = await atom.workspace.open(badPath);
    const expected = 'ENV invalid format ENV_VARIABLE';
    const messages = await lint(editor);

    expect(messages[0].type).toBe('Error');
    expect(messages[0].text).toBe(expected);
    expect(messages[0].filePath).toBe(badPath);
    expect(messages[0].range).toEqual([[1, 0], [1, 0]]);
  });

  it("shows errors in an a file without instruction 'FROM'", async () => {
    const editor = await atom.workspace.open(badNoFromPath);
    const expected = "First instruction must be 'FROM', is: RUN";
    const messages = await lint(editor);

    expect(messages[0].type).toBe('Error');
    expect(messages[0].text).toBe(expected);
    expect(messages[0].filePath).toBe(badPath);
    expect(messages[0].range).toEqual([[1, 0], [1, 0]]);
  });

  it("shows errors in an a file with repeated instruction 'CMD'", async () => {
    const editor = await atom.workspace.open(badRepeatedCMDPath);
    const expected = 'Multiple CMD instructions found, only line 3 will take effect';
    const messages = await lint(editor);

    expect(messages[0].type).toBe('Error');
    expect(messages[0].text).toBe(expected);
    expect(messages[0].filePath).toBe(badPath);
    expect(messages[0].range).toEqual([[1, 0], [1, 0]]);
  });

  it('shows errors in an empty file', async () => {
    const editor = await atom.workspace.open(emptyPath);
    const expected = `ERROR: ${emptyPath} does not contain any instructions`;
    const messages = await lint(editor);

    expect(messages[0].type).toBe('Error');
    expect(messages[0].text).toBe(expected);
    expect(messages[0].filePath).toBe(emptyPath);
    expect(messages[0].range).toEqual([[0, 0], [0, 0]]);
  });
});
