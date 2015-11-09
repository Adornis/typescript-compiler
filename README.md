## TypeScript compilers for Meteor.

Package exposes two TypeScript compilers: one basic compiler `TsCompiler` and one caching compiler `TsCachingCompiler` to be used in a Meteor compiler plugin.

[This](https://github.com/barbatus/typescript) TypeScript package is used as a TypeScript provider.

## Getting Started
Add new package (into the packages folder) and register new Meteor plugin there:
````js
Package.registerBuildPlugin({
  name: 'TSBuilder',
  sources: [
    'ts_handler.js'
  ],
  use: [
    'barbatus:ts-compilers@0.1.8',
    'ecmascript@0.1.4'
  ]
});
````
In `ts_handler.js`, add one of two provided compilers as follows:

````js
Plugin.registerCompiler({
  extensions: ['ts'],
}, () => new TsCachingCompiler());
````

Please, check out how everything works in the demo app.

## Compilers
### TsCompiler
Compilales all passed `.ts`-files at once using internally `TypeScript.transpileFiles`.

One of its potential benefits is faster compilation speed on the initial Meteor run. Given that all files are provided to the TypeScript transpiler in a batch, TypeScript can transpile them more effiently using internal cache.

### TsCachingCompiler
Extends Meteor's [`MultiFileCachingCompiler`](https://atmospherejs.com/meteor/caching-compiler) and compiles one file content per time using this method [`TypeScript.transpile`](https://github.com/barbatus/typescript/blob/master/typescript.js#L96) internally.

## TypeScript Config
Compilers can be configured via `.tsconfig` in the app root folder. Format of the `.tsconfig` follows the `compilerOptions` part with the same options as you can fine in the standard `.tsconfig` file [here](https://github.com/Microsoft/TypeScript/wiki/tsconfig.json); `files` part is omitted.

Some of the TypeScript options are preset to be always turned on or off according to details of the Meteor environment. You can read about exceptions [here](https://github.com/barbatus/typescript).

A couple of additional options have been added: `alwaysThrow` and `useCache`.

When `alwaysThrow` is set, the compiler will always throw exceptions whenever syntactic or symantic error occurs. Otherwise, it throws by default only on syntactic errors, semantic ones (like module resolution errors, unknown variables etc) are just logged in the terminal.

`useCache` simple says compiler to turn on/off caching results.

## Compilation Speed-up
`noResolve` is designated to turn on/off module resolution process. During that process TypeScript checks availability of each module and verify that API usage is correct as well, which can be quite time assuming especially
for big apps because each imported module's file is being read and parsed. Therefor you might consider turning it off during intensive period of the app development while Meteor is running at the same time. TypeScript will skip resolving each module but will continue cursing on syntactic errors.

From time to time you can switch `noResolve` back to false with the `useCache` set to false and re-start Meteor.
You'll see all mistakes (if any) you have made including missing modules errors or incorrect API usage etc.

## Example of usage
Please, check Angular2's demo called Socially [here](https://github.com/Urigo/Meteor-Angular2/tree/master/examples/parties). It's built fully in TypeScript and uses `.tsconfig` as well.
