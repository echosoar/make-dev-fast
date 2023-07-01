import { BasePlugin } from '@midwayjs/command-core';
import { exec } from './utils';
import { dirname, join } from 'path';
export class WherePlugin extends BasePlugin {
  commands = {
    where: {
      usage: 'dev where',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
    },
  };

  hooks = {
    'where:do': this.handleWhere.bind(this),
  };

  async handleWhere() {
    const command = this.core.coreOptions.commands[1];
    if (!command) {
        return;
    }
    let which;
    try {
        which = await exec(`which ${command}`, { slience: true })
    } catch (e) {
        console.log('not found ', command);
        return;
    }
    console.log(`${command} -> ${which} [bin]`);
    const lsResult = await exec(`ls -l ${which}`, { slience: true })
    if (/->\s*(.*)/.test(lsResult)) {
        const link = /->\s*(.*)/.exec(lsResult)[1];
        console.log(`${command} -> ${join(dirname(which), link)} [link]`);
    }
  }
}
