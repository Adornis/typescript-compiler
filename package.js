Package.describe({
  name: 'adornis:typescript-compiler',
  version: '0.12.14',
  summary: 'TypeScript Compiler for Meteor, based on barbatus:typescript-compiler',
  git: 'https://github.com/adornis/typescript-compiler',
  documentation: 'README.md',
});

Npm.depends({
  async: '2.5.0',
  colors: '1.1.2',
  chalk: '2.4.1',
  'random-js': '1.0.8',
  'object-sizeof': '1.3.0',
  underscore: '1.9.1',
  diff: '2.2.2',
  'lru-cache': '4.1.1',
  typescript: process.env.TYPESCRIPT_EXTERNAL_PATH ? 'file://' + process.env.TYPESCRIPT_EXTERNAL_PATH : '3.6.3',
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1');

  api.use(['ecmascript@0.10.8', 'check@1.0.5', 'underscore@1.0.4'], 'server');

  api.addFiles(['logger.js', 'file-utils.js', 'typescript-compiler.js', 'typescript.js', 'utils.js'], 'server');

  api.export(['TypeScript', 'TypeScriptCompiler'], 'server');
});
