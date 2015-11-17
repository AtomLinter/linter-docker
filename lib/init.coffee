path = require 'path'

{CompositeDisposable} = require 'atom'

module.exports =
  config:
    executablePath:
      type: 'string'
      title: 'Some Executable Path'
      default: path.join __dirname, '..', 'node_modules', 'dockerlint', 'bin', 'dockerlint.js'
  activate: ->
    # console.log 'activate linter-docker'
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.config.observe 'linter-docker.executablePath',
      (executablePath) =>
        @executablePath = executablePath
  deactivate: ->
    @subscriptions.dispose()
  provideLinter: ->
    helpers = require('atom-linter')
    provider =
      name: 'linter-docker'
      grammarScopes: ['source.dockerfile']
      scope: 'file' # or 'project'
      lintOnFly: true # must be false for scope: 'project'
      lint: (textEditor) =>
        filePath = textEditor.getPath()
        # console.log 'linter-docker', @executablePath, filePath
        return helpers.execNode(@executablePath, [filePath], {stream: 'stderr', throwOnStdErr:false})
          .then (output) ->
            # console.log 'output', output
            results = helpers.parse(output, '(?<type>WARN|ERROR):(?<message>.*) on line (?<line>\\d+)')
            return results.map (r) ->
              r.type = if r.type == 'WARN' then 'Warning' else 'Error'
              r.text = r.text.replace /^\s+|\s+$/g, ""
              r.filePath = filePath
              return r
