var ts = require("typescript");
var _ = require("underscore");
var randomstring = require("randomstring");

var meteorTS = require("../dist/index");
var CompileCache = require("../dist/cache").CompileCache;

describe("meteor-typescript -> ", function() {
  function getOptions(options) {
    if (! options) options = {};
    options.useCache = false;
    return options;
  }

  describe("testing utils -> ", function() {
    it("convert exclude wildcard to regular exps", function() {
      var regExp = new RegExp(meteorTS.getExcludeRegExp(["typings"]));
      expect(regExp.test('/typings/lib.d.ts')).toEqual(true);
    });
  });

  describe("cache profiling -> ", function() {
    var files = {};
    _.times(10, function() {
      var name = randomstring.generate(10);
      files[name] = {
        content: randomstring.generate(1024 * 1024)
      };
    });

    var cache = new CompileCache(null, {
      get: function(filePath) {
        return files[filePath];
      }
    });

    var filePaths = _.keys(files);
    _.each(filePaths, function(filePath) {
      cache.save(filePath, {}, files[filePath]);
    });

    var elapsed = 0;
    _.each(filePaths, function(filePath) {
      var start = Date.now();
      var result = cache.get(filePath, {}, function() {
        return null;
      });
      var elapsed = Date.now() - start;
      expect(elapsed <= 10).toEqual(true);
      expect(result).toEqual(files[filePath]);
    });
  });
});
