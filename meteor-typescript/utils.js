// Copied from https://github.com/meteor/babel/blob/master/util.js

import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import assert from "assert";
import _ from "underscore";

exports.mkdirp = function mkdirp(dir) {
  if (! fs.existsSync(dir)) {
    var parentDir = path.dirname(dir);
    if (parentDir !== dir) {
      mkdirp(parentDir);
    }

    try {
      fs.mkdirSync(dir);
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  return dir;
};

// Borrowed from another MIT-licensed project that benjamn wrote:
// https://github.com/reactjs/commoner/blob/235d54a12c/lib/util.js#L136-L168
function deepHash(val) {
  var hash = createHash("sha1");
  var type = typeof val;

  if (val === null) {
    type = "null";
  }

  switch (type) {
    case "object":
      var keys = Object.keys(val);

      // Array keys will already be sorted.
      if (! Array.isArray(val)) {
        keys.sort();
      }

      keys.forEach(function(key) {
        if (typeof val[key] === "function") {
          // Silently ignore nested methods, but nevertheless complain below
          // if the root value is a function.
          return;
        }

        hash.update(key + "\0").update(deepHash(val[key]));
      });

      break;

    case "function":
      assert.ok(false, "cannot hash function objects");
      break;

    default:
      hash.update("" + val);
      break;
  }

  return hash.digest("hex");
}

exports.deepHash = function(val) {
  var argc = arguments.length;
  if (argc === 1) {
    return deepHash(val);
  }

  var args = new Array(argc);
  for (var i = 0; i < argc; ++i) {
    args[i] = arguments[i];
  }

  return deepHash(args);
};

exports.assertProps = function(obj, props) {
  assert.ok(obj);
  assert.ok(props);

  var len = props.length;
  for (var i = 0; i < len; i++) {
    assert.ok(_.has(obj, props[i]), `Prop ${props[i]} not defined`);
  }
};
