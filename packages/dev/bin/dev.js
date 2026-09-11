#!/usr/bin/env node
'use strict';
const minimist = require('minimist');
const rawArgs = process.argv.slice(2);
const argv = minimist(rawArgs);
const fetchCommandIndex = argv._[0] === 'fetch' ? rawArgs.indexOf('fetch') : -1;
if (fetchCommandIndex !== -1) {
    argv.fetchArgs = rawArgs.slice(fetchCommandIndex + 1);
    if (argv.fetchArgs.includes('-h')) {
        delete argv.h;
    }
    if (argv.fetchArgs.includes('--help')) {
        delete argv.help;
    }
}
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
