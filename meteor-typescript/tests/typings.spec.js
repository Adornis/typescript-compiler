var ts = require("typescript");
var fs = require("fs");

var meteorTS = require("../dist/index");

describe("meteor-typescript -> ", function() {
  function getOptions(options) {
    if (! options) options = {};
    options.useCache = false;
    return options;
  }

  describe("testing diagnostics and typings -> ", function() {
    var codeLineWithImport = "import {api} from 'lib'; export const foo = 'foo'";

    it("should contain a semantic error when some module undefined", function() {
      var result = meteorTS.compile(codeLineWithImport, getOptions());

      expect(result.diagnostics.semanticErrors).not.toBeNull();
      expect(result.diagnostics.semanticErrors.length).toEqual(1);
      var code = result.diagnostics.semanticErrors[0].code;
      expect(code).toEqual(ts.Diagnostics.Cannot_find_module_0.code);
      var error = result.diagnostics.semanticErrors[0].message;
      expect(error).toContain("Cannot find module 'lib'");
    });

    it("diagnostics re-evaluation works fine", function() {
      var result1 = meteorTS.compile(codeLineWithImport);

      var code1 = result1.diagnostics.semanticErrors[0].code;
      expect(code1).toEqual(ts.Diagnostics.Cannot_find_module_0.code);

      var result2 = meteorTS.compile(codeLineWithImport);

      var code2 = result2.diagnostics.semanticErrors[0].code;
      expect(code2).toEqual(ts.Diagnostics.Cannot_find_module_0.code);
    });

    it("declaration file with module declaration should remove an error", function() {
      var result = meteorTS.compile(codeLineWithImport, getOptions({
        typings: ["typings/lib.d.ts"]
      }));

      expect(result.diagnostics.semanticErrors).not.toBeNull();
      expect(result.diagnostics.semanticErrors.length).toEqual(0);
    });

    it("should always include core lib by default", function() {
      var codeLine = "new Object();";
      var result = meteorTS.compile(codeLine, getOptions({
        arch: "web.browser"
      }));

      expect(result.diagnostics.semanticErrors.length).toEqual(0);
    });

    it("should not include DOM lib by default", function() {
      var codeLine = "new Plugin()";
      var result = meteorTS.compile(codeLine, getOptions({
        arch: "os"
      }));

      expect(result.diagnostics.semanticErrors.length).toEqual(1);
    });

    it("should contain reference types module in dependencies", function() {
      var codeLine = "/// <reference types='@types/jquery' /> \n " +
                   "const jquery = $;";

      var result = meteorTS.compile(codeLine, getOptions());

      expect(result.diagnostics.semanticErrors.length).toEqual(0);
      expect(result.dependencies.refTypings[0]).toContain('@types/jquery');
    });
  });
});
