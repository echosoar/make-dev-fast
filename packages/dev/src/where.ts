import { BasePlugin } from '@midwayjs/command-core';
import { exec } from './utils';
import { dirname, join, resolve } from 'path';
import { statSync, readdirSync } from 'fs';
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

    // 1) gather paths from $PATH that contain the command
    const pathMatches: string[] = [];
    const pathEnv = process.env.PATH || '';
    for (const dir of pathEnv.split(':').filter(Boolean)) {
      const candidate = join(dir, command);
      let stat;
      try {
        stat = statSync(candidate);
      } catch (e) {
        continue;
      }
      if (stat.isFile() || stat.isSymbolicLink()) {
        pathMatches.push(candidate);
      }
    }

    // 2) gather paths from `which -a` (all matches, in PATH order)
    let whichMatches: string[] = [];
    try {
      const whichAll = await exec(`which -a ${command}`, { slience: true });
      whichMatches = whichAll.split(/\n/).map(s => s.trim()).filter(Boolean);
    } catch (e) {
      // ignore
    }

    // 3) merge and dedup, preserving order (PATH order first)
    const seen = new Set<string>();
    const allPaths: string[] = [];
    for (const p of [...pathMatches, ...whichMatches]) {
      const norm = resolve(p);
      if (!seen.has(norm)) {
        seen.add(norm);
        allPaths.push(p);
      }
    }

    if (allPaths.length === 0) {
      console.log('not found ', command);
      return;
    }

    // 4) print each path, resolving symlinks
    for (const p of allPaths) {
      console.log(`${command} -> ${p} [bin]`);
      try {
        const lsResult = await exec(`ls -l ${p}`, { slience: true });
        if (/->\s*(.*)/.test(lsResult)) {
          const link = /->\s*(.*)/.exec(lsResult)[1];
          console.log(`${command} -> ${join(dirname(p), link)} [link]`);
        }
      } catch (e) {
        // ignore ls errors
      }
    }

    if (allPaths.length > 1) {
      console.log(`(${allPaths.length} matches found)`);
    }
  }
}
