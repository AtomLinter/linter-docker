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
            const results = helpers.parse(output, '(?<type>WARN|ERROR):(?<message>.*) on line (?<line>\\d+)');
            return results.map((r) => {
              const message = r;
              message.type = r.type === 'WARN' ? 'Warning' : 'Error';
              message.text = r.text.replace(/^\s+|\s+$/g, '');
              message.filePath = filePath;
              return message;
            });
          });
      },
    };
  },
};
