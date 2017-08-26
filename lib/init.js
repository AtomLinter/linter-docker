const path = require('path');

const {CompositeDisposable} = require('atom');

module.exports = {
  config: {
    executablePath: {
      type: 'string',
      title: 'dockerlint Executable Path',
      default: path.join(__dirname, '..', 'node_modules', 'dockerlint', 'bin', 'dockerlint.js')
    }
  },

  activate() {
    this.subscriptions = new CompositeDisposable;
    return this.subscriptions.add(atom.config.observe('linter-docker.executablePath',
      executablePath => {
        return this.executablePath = executablePath;
    })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    let provider;
    const helpers = require('atom-linter');
    return provider = {
      name: 'dockerlint',
      grammarScopes: ['source.dockerfile'],
      scope: 'file', // or 'project'
      lintOnFly: true, // must be false for scope: 'project'
      lint: textEditor => {
        const filePath = textEditor.getPath();
        return helpers.execNode(this.executablePath, [filePath], {stream: 'stderr', throwOnStderr:false, allowEmptyStderr: true})
          .then(function(output) {
            const results = helpers.parse(output, '(?<type>WARN|ERROR):(?<message>.*) on line (?<line>\\d+)');
            return results.map(function(r) {
              r.type = r.type === 'WARN' ? 'Warning' : 'Error';
              r.text = r.text.replace(/^\s+|\s+$/g, "");
              r.filePath = filePath;
              return r;
            });
        });
      }
    };
  }
};
