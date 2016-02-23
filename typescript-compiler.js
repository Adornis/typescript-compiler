'use strict';

const async = Npm.require('async');
const Future = Npm.require('fibers/future');

TypeScriptCompiler = class TypeScriptCompiler {
  constructor(extraOptions, maxParallelism, logFn) {
    TypeScript.validateExtraOptions(extraOptions);

    this.extraOptions = extraOptions;
    this.maxParallelism = maxParallelism || 10;
    this.tsconfig = null;
    this.cfgHash = null;
    this.logFn = logFn || console.log;
  }

  processFilesForTarget(inputFiles) {
    // If tsconfig.json has changed, create new one.
    this.processConfig(inputFiles);

    // Filters out typings and tsconfig.
    // Other files should be compiled.
    let tsFiles = inputFiles.filter(inputFile => 
      !(this.isConfigFile(inputFile) || this.isDeclarationFile(inputFile)));

    const future = new Future;
    async.eachLimit(tsFiles, this.maxParallelism, (inputFile, cb) => {
      let source = inputFile.getContentsAsString();
      let packageName = inputFile.getPackageName();
      let inputFilePath = inputFile.getPathInPackage();
      let outputFilePath = removeTsExt(inputFilePath) + '.js';
      let fileOptions = inputFile.getFileOptions();
      let toBeAdded = {
        sourcePath: inputFilePath,
        path: outputFilePath,
        data: source,
        hash: inputFile.getSourceHash(),
        sourceMap: null,
        bare: !! fileOptions.bare
      };

      let error = null;
      try {
        let compilerOptions = this.tsconfig ?
          this.tsconfig.compilerOptions : null;

        compilerOptions = TypeScript.getCompilerOptions(
          compilerOptions, this.extraOptions);

        let filePath = this.getExtendedPath(inputFile);
        let typings = this.tsconfig ? this.tsconfig.typings : [];
        let moduleName = this.getFileModuleName(inputFile, compilerOptions);

        let options = {
          compilerOptions,
          moduleName,
          filePath,
          typings
        };

        let result = TypeScript.compile(source, options);
        this.processDiagnostics(inputFile,
          result.diagnostics, compilerOptions);

        toBeAdded.data = result.code;
        toBeAdded.sourceMap = result.sourceMap;

        inputFile.addJavaScript(toBeAdded);
      } catch (e) {
        error = e;
      } finally {
        cb(error);
      }
    }, future.resolver());
    future.wait();
  }

  processDiagnostics(inputFile, diagnostics, compilerOptions) {
    // Always throw syntax errors.
    diagnostics.syntacticErrors.forEach(diagnostic => {
      inputFile.error({
        message: diagnostic.message,
        sourcePath: this.getExtendedPath(inputFile),
        line: diagnostic.line,
        column: diagnostic.column
      });
    });

    let packageName = inputFile.getPackageName();
    if (packageName) return;

    // And log out other errors except package files.
    if (compilerOptions && compilerOptions.diagnostics) {
      diagnostics.semanticErrors.forEach(diagnostic => {
        let error = {
          message: diagnostic.message,
          sourcePath: this.getExtendedPath(inputFile),
          line: diagnostic.line,
          column: diagnostic.column
        };
        this.logFn(`${error.sourcePath} (${error.line}, ${error.column}): ${error.message}`);
      });
    }
  }

  getExtendedPath(inputFile, noExt) {
    let packageName = inputFile.getPackageName();
    let inputFilePath = inputFile.getPathInPackage();

    let filePath = packageName ?
      ('packages/' + packageName + '/' + inputFilePath) : inputFilePath;

    return noExt ? removeTsExt(filePath) : filePath;
  }

  getFileModuleName(inputFile, options) {
    return options.module !== 'none' ?
      this.getExtendedPath(inputFile, true): null;
  }

  isDeclarationFile(inputFile) {
    return TypeScript.isDeclarationFile(inputFile.getBasename());
  }

  isConfigFile(inputFile) {
    return inputFile.getBasename() === 'tsconfig.json';
  }

  processConfig(inputFiles) {
    let cfgFile = inputFiles.filter(
      inputFile => this.isConfigFile(inputFile))[0];
    if (cfgFile) {
      let source = cfgFile.getContentsAsString();
      let hash = cfgFile.getSourceHash();
      // If hashes differ, create new tsconfig. 
      if (hash !== this.cfgHash) {
        this.tsconfig = this.parseConfig(source);
        this.cfgHash = hash;
      }
    }
  }

  parseConfig(cfgContent) {
    try {
      let tsconfig = JSON.parse(cfgContent);
      if (tsconfig.files) {
        // Allow only typings in the "files" array.
        tsconfig.typings = this.getTypings(tsconfig.files);
      }

      return tsconfig;
    } catch(err) {
      throw new Error(`Format of the tsconfig is invalid: ${err}`);
    }
  }

  getTypings(filePaths) {
    check(filePaths, Array);

    return filePaths.filter(filePath => {
      return TypeScript.isDeclarationFile(filePath);
    });
  }
}

function removeTsExt(path) {
  return path.replace(/(\.tsx|\.ts)$/g, '');
}
