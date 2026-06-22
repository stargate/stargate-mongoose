'use strict';

const { execSync } = require('child_process');
const fs = require('fs');

// hard-code name because `npm pack` transforms namespaced names
const name = 'datastax-astra-mongoose';
const { version } = JSON.parse(fs.readFileSync('./package.json'));

execSync('npm pack');
execSync(`mv ${name}-${version}.tgz ${name}.tgz`);
