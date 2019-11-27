Package.describe({
  name: 'adornis:typescript-compiler',
  version: '0.12.14',
  summary: 'TypeScript Compiler for Meteor, based on barbatus:typescript-compiler',
  git: 'https://github.com/adornis/typescript-compiler',
  documentation: 'README.md',
});

Npm.depends({
  colors: '1.4.0',
  chalk: '3.0.0',
  'random-js': '1.0.8',
  'object-sizeof': '1.5.2',
  underscore: '1.9.1',
  diff: '4.0.1',
  'lru-cache': '5.1.1',
  typescript: process.env.TYPESCRIPT_EXTERNAL_PATH ? 'file://' + process.env.TYPESCRIPT_EXTERNAL_PATH : '3.7.2',
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1');

  api.use(['ecmascript@0.10.8', 'check@1.0.5', 'underscore@1.0.4'], 'server');

  api.addFiles(['logger.js', 'file-utils.js', 'typescript-compiler.js', 'typescript.js', 'utils.js'], 'server');

  api.export(['TypeScript', 'TypeScriptCompiler'], 'server');
});
