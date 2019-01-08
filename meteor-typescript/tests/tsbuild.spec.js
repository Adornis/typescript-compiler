var ts = require("typescript");
var fs = require("fs");

var meteorTS = require("../dist/index");
var TSBuild = require("../dist/index").TSBuild;

describe("meteor-typescript -> ", () => {
  function getOptions(options) {
    if (! options) options = {};
    options.useCache = false;
    options.evalDepth = 1;
    return options;
  }

  describe("testing incremental build -> ", () => {
    var testCodeLine = "export const foo = 'foo'";

    it("should compile with defaults", () => {
      var build = new TSBuild(["foo.ts"], (filePath) => {
        if (filePath === "foo.ts") return testCodeLine;
      }, getOptions());
      var result = build.emit("foo.ts");
      expect(result.code).toContain("exports.foo");
    });

    it("meteor compiler options preset applied", () => {
      var build = new TSBuild(["foo.ts"], (filePath) => {
        if (filePath === "foo.ts") return testCodeLine;
      }, getOptions());

      expect(build.options.compilerOptions).toEqual(
        jasmine.objectContaining({
          watch: false,
          outDir: null,
          outFile: null
        }));
    });

    it("should access local dependency using provided content getter", () => {
      var importCodeLine = "import {foo} from '../foo1'; var test = foo;";

      var options = meteorTS.getDefaultOptions();
      var build = new TSBuild(["foo1.ts", "client/foo2.ts"], (filePath) => {
        if (filePath === "foo1.ts") return testCodeLine;
        if (filePath === "client/foo2.ts") return importCodeLine;
      }, options);

      var result = build.emit("client/foo2.ts");

      expect(result.diagnostics.semanticErrors.length).toEqual(0);
    });

    it("file version should grow when file is changed", () => {
      var changedCode = "export const foo = 'foo1'";

      var build1 = new TSBuild(["foo3.ts"], (filePath) => {
        if (filePath === "foo3.ts") return testCodeLine;
      }, getOptions());

      var result1 = build1.emit("foo3.ts");

      var build2 = new TSBuild(["foo3.ts"], (filePath) => {
        if (filePath === "foo3.ts") return changedCode;
      }, getOptions());

      var result2 = build2.emit("foo3.ts");

      expect(result1.version).toEqual("1");
      expect(result2.version).toEqual("2");
    });

    it("file version should remain the same if file is not changed", () => {
      var build = new TSBuild(["foo4.ts"], (filePath) => {
        if (filePath === "foo4.ts") return testCodeLine;
      });
      var result1 = build.emit("foo4.ts");
      var result2 = build.emit("foo4.ts");

      expect(result1.version).toEqual(result2.version);
    });

    describe("diagnostics updates ->", () => {
      it("should update diagnostics when file's module dependency has changed", () => {
        var indexCode = "export * from './foo5'";
        var importCodeLine = `
          import {Meteor} from 'meteor/meteor';
          import {foo} from './index';
        `;

        var options = meteorTS.getDefaultOptions();
        var build1 = new TSBuild(["index.ts", "foo5.ts", "foo6.ts"], (filePath) => {
          if (filePath === "index.ts") return indexCode;
          if (filePath === "foo5.ts") return testCodeLine;
          if (filePath === "foo6.ts") return importCodeLine;
        }, options);

        var result1 = build1.emit("foo6.ts");

        expect(result1.diagnostics.semanticErrors.length).toEqual(0);
        // Check if transitivity is handled.
        expect(result1.dependencies.modules.length).toEqual(2);
        expect(result1.dependencies.modules).toContain('foo5.ts');
        expect(result1.dependencies.modules).toContain('index.ts');

        var changedCode = "export const foo1 = 'foo'";
        var build2 = new TSBuild(["index.ts", "foo5.ts", "foo6.ts"], (filePath) => {
          if (filePath === "index.ts") return indexCode;
          if (filePath === "foo5.ts") return changedCode;
          if (filePath === "foo6.ts") return importCodeLine;
        }, options);

        var result2 = build2.emit("foo6.ts");

        expect(result2.diagnostics.semanticErrors.length).toEqual(1);
      });

      it("should update diagnostics if indirect dependency has changed", () => {
        var classACode = "export default class A { print() {} }";
        var classBCode = "import A from './a'; export default class B { a = new A(); }";
        var testCode = "import B from './b'; new B().a.print();";

        var options = meteorTS.getDefaultOptions();
        var build1 = new TSBuild(["test.ts", "a.ts", "b.ts"], (filePath) => {
          if (filePath === "test.ts") return testCode;
          if (filePath === "a.ts") return classACode;
          if (filePath === "b.ts") return classBCode;
        }, options);

        var result1 = build1.emit("b.ts");

        expect(result1.diagnostics.semanticErrors.length).toEqual(0);

        var changedACode = "export default class A { newPrint() {} }";
        var build2 = new TSBuild(["test.ts", "a.ts", "b.ts"], (filePath) => {
          if (filePath === "test.ts") return testCode;
          if (filePath === "a.ts") return changedACode;
          if (filePath === "b.ts") return classBCode;
        }, options);

        var result2 = build2.emit("test.ts");

        expect(result2.diagnostics.semanticErrors.length).toEqual(1);
      });

      it("circular deps handled properly", () => {
        var classACode = "export default class A { print() {} }";
        var classBCode = `
          import A from './a';
          import {print} from './test';
          export default class B { a = new A(); }
        `;
        var testCode = `
          import B from './b';
          export const print = new B().a.print();
        `;

        var options = meteorTS.getDefaultOptions();
        var build1 = new TSBuild(["test.ts", "a.ts", "b.ts"], (filePath) => {
          if (filePath === "test.ts") return testCode;
          if (filePath === "a.ts") return classACode;
          if (filePath === "b.ts") return classBCode;
        }, options);

        build1.emit("b.ts");
        build1.emit("test.ts");

        var build2 = new TSBuild(["test.ts", "a.ts", "b.ts"], (filePath) => {
          if (filePath === "test.ts") return testCode;
          if (filePath === "a.ts") return classACode;
          if (filePath === "b.ts") return classBCode;
        }, options);

        var result1 = build2.emit("test.ts");

        expect(result1.diagnostics.semanticErrors.length).toEqual(0);
      });

      it("should update diagnostics when typings has changed", () => {
        var foo7 = "declare module 'foo7' { export var foo = 'foo' }";
        var foo8 = "import {foo} from 'foo7'";

        var build1 = new TSBuild(["foo8.ts", "foo7.d.ts"], (filePath) => {
          if (filePath === "foo7.d.ts") return foo7;
          if (filePath === "foo8.ts") return foo8;
        });

        var result1 = build1.emit("foo8.ts");

        expect(result1.diagnostics.semanticErrors.length).toEqual(0);

        var newTypigns = "declare module 'foo7' { export var foo1 = 'foo' }";
        var build2 = new TSBuild(["foo7.d.ts", "foo8.ts"], (filePath) => {
          if (filePath === "foo7.d.ts") return newTypigns;
          if (filePath === "foo8.ts") return foo8;
        });

        var result2 = build2.emit("foo8.ts");

        expect(result2.diagnostics.semanticErrors.length).toEqual(1);
      });

      it("should update diagnostics when file's references has changed", () => {
        var foo9 = "module foo9 { export var foo = 'foo' }";
        var foo10 = "/// <reference path='foo9.ts' /> \n " +
                    "module foo10 { export var foo = foo9.foo }";

        var build1 = new TSBuild(["foo9.ts", "foo10.ts"], (filePath) => {
          if (filePath === "foo9.ts") return foo9;
          if (filePath === "foo10.ts") return foo10;
        });

        var result1 = build1.emit("foo10.ts");

        expect(result1.diagnostics.semanticErrors.length).toEqual(0);

        var changed = "module foo9 { export var foo1 = 'foo' }";
        var build2 = new TSBuild(["foo9.ts", "foo10.ts"], (filePath) => {
          if (filePath === "foo9.ts") return changed;
          if (filePath === "foo10.ts") return foo10;
        });

        var result2 = build2.emit("foo10.ts");

        expect(result2.diagnostics.semanticErrors.length).toEqual(1);
        expect(result2.diagnostics.semanticErrors[0].message)
          .toContain("'foo' does not exist");
      });

      it("should handle ambient typings properly", () => {
        var foo11 = "declare module Foo { interface Test {}};";
        var foo12 = "var test: Foo.Test";

        var build1 = new TSBuild(["foo11.d.ts", "foo12.ts"], (filePath) => {
          if (filePath === "foo11.d.ts") return foo11;
          if (filePath === "foo12.ts") return foo12;
        });

        var result1 = build1.emit("foo12.ts");

        expect(result1.diagnostics.semanticErrors.length).toEqual(0);
      });
    });

    it("should take result from cache for once compiled code", () => {
      var build1 = new TSBuild(["foo13.ts"], (filePath) => {
        if (filePath === "foo13.ts") return testCodeLine;
      });
      var result1 = build1.emit("foo13.ts");

      var changedCode = "export const foo1 = 'foo'";
      var build2 = new TSBuild(["foo13.ts"], (filePath) => {
        if (filePath === "foo13.ts") return changedCode;
      });
      var result2 = build2.emit("foo13.ts");

      var build3 = new TSBuild(["foo13.ts"], (filePath) => {
        if (filePath === "foo13.ts") return testCodeLine;
      });
      var result3 = build3.emit("foo13.ts");

      expect(result3).toEqual(result1);
    });

    it("should compile empty content", () => {
      var build = new TSBuild(["foo15.ts"], (filePath) => {
        if (filePath === "foo15.ts") return '';
      });
      var result = build.emit("foo15.ts");
    });

    it("should throw on emitting non-existed file", () => {
      var build = new TSBuild([]);
      var foo16 = function() {
        build.emit("foo16.ts");
      };

      expect(foo16).toThrow();
    });

    it("should evaluate script changes properly", () => {
      var content1 = fs.readFileSync("./file1.ts", 'utf8');
      var content2 = fs.readFileSync("./file2.ts", 'utf8');

      var build1 = new TSBuild(["foo17.ts"], (filePath) => {
        if (filePath === "foo17.ts") return content1;
      });
      var result1 = build1.emit("foo17.ts");

      var build2 = new TSBuild(["foo17.ts"], (filePath) => {
        if (filePath === "foo17.ts") return content2;
      });
      var result2 = build2.emit("foo17.ts");

      expect(result2.code).toContain("newlog");
      expect(result2.code).toContain("te_");
    });

    describe("path mappings ->", () => {
      it("path mappings should be replaced with rooted paths", () => {
        var foo12 = "import {foo} from 'foo/foo13'; const foo13 = foo;";
        var foo13 = testCodeLine;

        var options = meteorTS.getDefaultOptions();
        options.compilerOptions.paths = {
          "foo/*": ["imports/*"]
        };
        var build = new TSBuild(["foo12.ts", "imports/foo13.ts"], (filePath) => {
          if (filePath === "foo12.ts") return foo12;
          if (filePath === "imports/foo13.ts") return foo13;
        }, options);

        var result = build.emit("foo12.ts");
        expect(result.diagnostics.semanticErrors.length).toEqual(0);
        expect(result.code).toMatch(/require\(('|")\/imports\/foo13('|")\)/);
      });

      it("paths replacement should not affect other code", () => {
        var foo13 = "import {foo} from 'foo'; const foo14 = foo;";
        var foo14 = testCodeLine;

        var options = meteorTS.getDefaultOptions();
        options.compilerOptions.paths = {
          "foo": ["imports/foo14"]
        };
        var build = new TSBuild(["foo13.ts", "imports/foo14.ts"], (filePath) => {
          if (filePath === "foo13.ts") return foo13;
          if (filePath === "imports/foo14.ts") return foo14;
        }, options);

        var result = build.emit("foo13.ts");
        expect(result.diagnostics.semanticErrors.length).toEqual(0);
        expect(result.code).toMatch(/require\(('|")\/imports\/foo14('|")\)/);
        expect(result.code).toContain("foo14 = foo");
      });

      it("should resolve module path that starts with /", () => {
        var file15 = 'import {api} from "/imports/foo16"';
        var file16 = 'export const api = {}';
        var build = new TSBuild(["imports/foo15.ts", "imports/foo16.ts"], (filePath) => {
          if (filePath === "imports/foo15.ts") return file15;
          if (filePath === "/imports/foo16.ts") return file16;
        });

        var result = build.emit("imports/foo15.ts");
        expect(result.diagnostics.semanticErrors.length).toEqual(0);
      });

      it("direct path mappings should be resolved correctly", () => {
        var foo17 = "import {foo} from 'meteor/my-pkg'; const foo13 = foo;";
        var foo18 = testCodeLine;

        var options = meteorTS.getDefaultOptions();
        options.compilerOptions.paths = {
          "meteor/my-pkg": ["pkgs/my-pkg/pkg-client"]
        };
        var build = new TSBuild(["foo17.ts", "pkgs/my-pkg/pkg-client.ts"], (filePath) => {
          if (filePath === "foo17.ts") return foo17;
          if (filePath === "pkgs/my-pkg/pkg-client.ts") return foo18;
        }, options);

        var result = build.emit("foo17.ts");
        expect(result.diagnostics.semanticErrors.length).toEqual(0);
      });
    });
  });
});
