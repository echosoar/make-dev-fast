#!/usr/bin/env node
'use strict';
const minimist = require('minimist');
const argv = minimist(process.argv.slice(2));
const { CLI } = require('../dist');
;(async () => {
    const cli = new CLI(argv);
    cli
      .start()
      .then(() => {
        process.exit();
      })
      .catch(e => {
        console.log('\n\n\n');
        console.log(
          'Error! You can try adding the -V parameter for more information output.'
        );
        console.log('\n\n\n');
        console.error(e);
        process.exitCode = 1;
        process.exit(1);
      });
})();
