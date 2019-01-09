Package.describe({
  name: 'adornis:typescript-compiler',
  version: '0.12.3',
  summary: 'TypeScript Compiler for Meteor, prop to barbatus:typescript-compiler',
  git: 'https://github.com/adornis/typescript-compiler',
  documentation: 'README.md',
});

Npm.depends({
  // 'meteor-typescript': '0.9.0', // is now in this directory because I'm lazy
  async: '2.5.0',
  colors: '1.1.2',
  chalk: '2.4.1',
  'random-js': '1.0.8',
  'object-sizeof': '1.3.0',
  underscore: '1.9.1',
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1');

  api.use(['ecmascript@0.10.8', 'check@1.0.5', 'underscore@1.0.4'], 'server');

  api.addFiles(['logger.js', 'file-utils.js', 'typescript-compiler.js', 'typescript.js', 'utils.js'], 'server');

  api.export(['TypeScript', 'TypeScriptCompiler'], 'server');
});

Package.onTest(function(api) {
  api.use([
    'tinytest',
    'ecmascript',
    'underscore',
    'practicalmeteor:sinon',
    'practicalmeteor:chai',
    'practicalmeteor:mocha',
    'meteortesting:mocha',
    'dispatch:mocha-phantomjs',
  ]);
  api.use('adornis:typescript-compiler');

  api.addFiles(['tests/server/unit/input-file.js', 'tests/server/unit/compiler-tests_spec.js'], 'server');
});
