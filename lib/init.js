'use babel';

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies
import { CompositeDisposable } from 'atom';
import * as helpers from 'atom-linter';
import path from 'path';

module.exports = {
  config: {
    executablePath: {
      type: 'string',
      title: 'dockerlint Executable Path',
      default: path.join(__dirname, '..', 'node_modules', 'dockerlint', 'bin', 'dockerlint.js'),
    },
  },

  activate() {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.config.observe('linter-docker.executablePath', (value) => {
        this.executablePath = value;
      }),
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      name: 'dockerlint',
      grammarScopes: ['source.dockerfile'],
      scope: 'file', // or 'project'
      lintOnFly: true, // must be false for scope: 'project'
      lint: (textEditor) => {
        const filePath = textEditor.getPath();
        return helpers.execNode(this.executablePath, [filePath], { stream: 'stderr', throwOnStderr: false, allowEmptyStderr: true })
          .then((output) => {
            const lines = output.split('\n');
            const patterns = [
              {
                // regex for "ERROR: ENV invalid format ENV_VARIABLE on line 2"
                regex: /(WARN|ERROR):(.*) on line (\d+)/,
                cb: m => ({ lineNo: m[3], text: m[2], type: m[1] }),
              },
              {
                // regex for "ERROR: Multiple CMD instructions found, only line 3 will take effect"
                regex: /(WARN|ERROR):(.*), only line (\d+)/,
                cb: m => ({ lineNo: m[3], text: m[2], type: m[1] }),
              },
              {
                // regex for "ERROR: First instruction must be 'FROM', is: RUN"
                regex: /(WARN|ERROR): (First instruction must be 'FROM', is: .*)/,
                cb: m => ({ lineNo: 1, text: m[2], type: m[1] }),
              },
              {
                // regex for "ERROR: /path/to/Dockerfile does not contain any instructions"
                regex: /(WARN|ERROR): (.* does not contain any instructions)/,
                cb: m => ({ lineNo: 1, text: m[2], type: m[1] }),
              },
            ];
            const results = lines.map((line) => {
              const lineMatches = patterns.map((x) => {
                const match = line.match(x.regex);
                return match ? x.cb(match) : null;
              });
              const result = lineMatches.find(x => x !== null);
              return result;
            });
            const listOfMessages = results.reduce((messages, match) => {
              if (!match) {
                return messages;
              }

              messages.push({
                type: match.type === 'WARN' ? 'Warning' : 'Error',
                text: match.text.trim(),
                filePath,
                range: helpers.generateRange(textEditor, match.lineNo - 1),
              });
              return messages;
            }, []);

            return listOfMessages;
          });
      },
    };
  },
};
