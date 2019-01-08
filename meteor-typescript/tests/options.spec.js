var ts = require("typescript");

var meteorTS = require("../dist/index");

describe("meteor-typescript -> ", function() {
  function getOptions(options) {
    if (! options) options = {};
    options.useCache = false;
    return options;
  }

  describe("testing exports and options -> ", function() {
    var testCodeLine = "export const foo = 'foo'";

    it("should compile with defaults", function() {
      var result = meteorTS.compile(testCodeLine, getOptions());
      expect(result.code).toContain("exports.foo");
    });

    it("default options for the web should contain dom lib", function() {
      var options = meteorTS.getDefaultOptions("web.ios");
      expect(options.compilerOptions.lib.indexOf("dom")).not.toEqual(-1);
    });

    it("should throw on wrong option", function() {
      var test = function() {
        meteorTS.compile(testCodeLine, {
          "wrong": true
        });
      };
      expect(test).toThrow();
    });

    it("should allow null options", function() {
      var result = meteorTS.compile(testCodeLine, getOptions({
        compilerOptions: null,
        typings: undefined
      }));
      expect(result.code).not.toBeNull();
    });

    it("don't impose 'use strict' by default", function() {
      var result = meteorTS.compile(testCodeLine, getOptions());
      expect(result.code).not.toContain("use strict");
    });

    it("should recognize preset options", function() {
      var result = meteorTS.compile(testCodeLine, getOptions({
        compilerOptions: {
          module: "system"
        }
      }));
      expect(result.code).toContain("System.register");
    });

    it("should throw on wrong compiler option", function() {
      var test = function() {
          meteorTS.compile(testCodeLine, getOptions({
            compilerOptions: {
              module: "wrong"
            }
          }));
      };
      expect(test).toThrow();
    });

    it("should validate options", function() {
      var test = function() {
        meteorTS.validateAndConvertOptions({
          wrong: true
        });
      };

      expect(test).toThrow(new Error("Unknown option: wrong.\n" +
        "Valid options are compilerOptions, filePath, and typings."));
    });

    it("should validate tsconfig", function() {
      var test = function() {
        meteorTS.validateTsConfig({
          include: "foo"
        });
      };

      expect(test).toThrow();
    });

    it("should have isExternal to be true if ES6 modules are used and " +
        "false in case of internal modules", function() {
      var result = meteorTS.compile(testCodeLine, getOptions());
      expect(result.isExternal).toEqual(true);

      var codeLine = "module foo { export var fooVar = \'fooVar\'}";
      var result = meteorTS.compile(codeLine, getOptions());
      expect(result.isExternal).toEqual(false);
    });

    it("should compile React if jsx set", function() {
      var reactCodeLine = "class Component { render() { return <div />; } }";
      var result = meteorTS.compile(reactCodeLine, getOptions({
        compilerOptions: {
          jsx: "react"
        },
        typings: ["typings/lib.d.ts"]
      }));

      expect(result.diagnostics.semanticErrors.length).toEqual(0);
    });

    it("should compile target ES6", function() {
      var code = "async function {}";
      var result = meteorTS.compile(code, getOptions({
        compilerOptions: {
          target: "ES6"
        }
      }));

      // Async resolved through the generator in ES6
      expect(result.code).toContain("function*");
    });

    it("impose 'use strict' for ES6", function() {
      var result = meteorTS.compile(testCodeLine, getOptions({
        compilerOptions: {
          target: "ES6"
        }
      }));

      expect(result.code).toContain("use strict");
    });

    it("should resolve NodeJS-way by default", function() {
      var testCodeLine = "import {FakeApi} from 'lib/fake'";
      var result = meteorTS.compile(testCodeLine, getOptions());

      expect(result.diagnostics.semanticErrors.length).toEqual(0);
    });
  });
});
