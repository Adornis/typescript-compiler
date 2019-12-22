## TypeScript compiler for Meteor

Based on barbatus:typescript-compiler and also embeds the previously separate meteor-typescript package

Exports two symbols:

- `TypeScriptCompiler` - a compiler to be registered using `registerBuildPlugin`
  to compile TypeScript files.

- `TypeScript` - an object with `compile` method.
  Use `TypeScript.compile(source, options)` to compile with preset options.

### disable warnings

If `TYPESCRIPT_DISABLE_WARNINGS` is truthy, warnings will be omitted, reducing the lenght of console output in some cases. Of course, please use your linter instead, but keep in mind that many linters will only show you warnings and errors in opened files. 
