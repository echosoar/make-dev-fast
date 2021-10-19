import { BasePlugin } from '@midwayjs/command-core';

export class GitPlugin extends BasePlugin {
  commands = {
    clone: {
      usage: 'git clone',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
      alias: 'c',
    },
    push: {
      usage: 'git push to current branch',
      lifecycleEvents: [ 'do' ],
      alias: 'ps'
    },
  };

  hooks = {
    'push:do': this.handlePushDo.bind(this),
    'clone:do': this.handleCloneDo.bind(this),
  };

  async handleCloneDo() {
    const { commands } = this.core.coreOptions;
    console.log('clone', commands);
  }

  async handlePushDo() {
    console.log('push');
  }
}
