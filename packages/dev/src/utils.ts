import { exec as cpExec } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync, ensureFileSync } from 'fs-extra';
import { writeFileSync } from 'fs';
export async function exec(cmd: string, options?: any): Promise<string> {
    if (!cmd) {
      return '';
    }
    options = Object.assign({ slience: true }, options);
    return new Promise((resolved, rejected) => {
      const execProcess = cpExec(cmd, (err, result) => {
        if (err) {
          return rejected(err);
        }
        resolved(result.replace(/\n$/, '').replace(/^\s*|\s*$/, ''));
      });
      execProcess.stdout.on('data', (data) => {
        if (!options || !options.slience) {
          console.log(data);
        }
      });
    });
  }

const getGlobalCache = () => {
    return join(homedir(), '.make-dev-fast/cache.json');
}
export const getCache = (type?: string, key?: string) => {
    const cacheFile = getGlobalCache();
    let cacheData = {};
    if (existsSync(cacheFile)) {
        cacheData = JSON.parse(readFileSync(cacheFile).toString());
    }
    if (!type) {
        return cacheData;
    }
    if (!key) {
        return cacheData?.[type] || {};
    }
    return cacheData?.[type]?.[key];
}

export const setCache = (type, key, value) => {
    const cache = getCache();
    if (!cache[type]) {
        cache[type] = {};
    }
    cache[type][key] = value;
    const cacheFile = getGlobalCache();
    ensureFileSync(cacheFile);
    writeFileSync(cacheFile, JSON.stringify(cache));
}