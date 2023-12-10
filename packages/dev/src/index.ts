import { CoreBaseCLI } from '@midwayjs/command-core';
import { GitPlugin } from './git';
import { WherePlugin } from './where';
import { StaticServerPlugin } from './static';

export class CLI extends CoreBaseCLI {
    // cli 扩展
    loadExtensions() {
      return {
        debug: this.debug.bind(this),
      };
    }
  
    error(err) {
      if (err && err.message) {
        console.log(err.message);
        throw err;
      } else {
        console.log(err);
        throw new Error(err);
      }
    }

    async loadPlugins() {
      this.debug('command & options', this.argv);
      await this.loadDefaultOptions();
      await super.loadPlugins();
    }

    async loadDefaultPlugin() {
        this.core.addPlugin(GitPlugin);
        this.core.addPlugin(WherePlugin);
        this.core.addPlugin(StaticServerPlugin);
    }
  
    async loadDefaultOptions() {
      if (this.commands.length) {
        return;
      }
  
      this.argv.h = true;
    }
  
    debug(...args) {
      if (!this.argv.V && !this.argv.verbose && !process.env.FAAS_CLI_VERBOSE) {
        return;
      }
      const log = this.loadLog();
      log.log('[Verbose] ', ...args);
    }
}
  