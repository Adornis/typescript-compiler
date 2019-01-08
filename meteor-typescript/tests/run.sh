#!/usr/bin/env bash

cd $(dirname $0)

rm -fr ".cache"

npm install

mkdir node_modules/lib
cp fake.d.ts node_modules/lib/fake.d.ts

istanbul cover jasmine-node -- --config "TYPESCRIPT_CACHE_DIR" ".cache" *
