path = require 'path'

{CompositeDisposable} = require 'atom'

module.exports =
  config:
    executablePath:
      type: 'string'
      title: 'dockerlint Executable Path'
      default: path.join __dirname, '..', 'node_modules', 'dockerlint', 'bin', 'dockerlint.js'

  activate: ->
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.config.observe 'linter-docker.executablePath',
      (executablePath) =>
        @executablePath = executablePath

  deactivate: ->
    @subscriptions.dispose()

  provideLinter: ->
    helpers = require('atom-linter')
    provider =
      name: 'dockerlint'
      grammarScopes: ['source.dockerfile']
      scope: 'file' # or 'project'
      lintOnFly: true # must be false for scope: 'project'
      lint: (textEditor) =>
        filePath = textEditor.getPath()
        return helpers.execNode(@executablePath, [filePath], {stream: 'stderr', throwOnStdErr:false, allowEmptyStderr: true})
          .then (output) ->
            results = helpers.parse(output, '(?<type>WARN|ERROR):(?<message>.*) on line (?<line>\\d+)')
            return results.map (r) ->
              r.type = if r.type == 'WARN' then 'Warning' else 'Error'
              r.text = r.text.replace /^\s+|\s+$/g, ""
              r.filePath = filePath
              return r
