import { exec as cpExec } from 'child_process';
import { join } from 'path';
import { homedir, networkInterfaces } from 'os';
import { existsSync, readFileSync, ensureFileSync, access } from 'fs-extra';
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

export const getGlobalCache = () => {
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

const verionBase = 1000;
const verionPatch = verionBase;
const verionMinor = verionPatch * verionBase;
const verionMajor = verionMinor * verionBase;
export const getVersion = version => {
  if (!version) {
    return 0;
  }
  const tagVersion = version.replace(/[^\d\.]/g, '').split('.');
  return (tagVersion[0] || 0) * verionMajor + (tagVersion[1] || 0) * verionMinor + (tagVersion[2] || 0) * verionPatch + (tagVersion[3] || 0);
}

export const formatVersion = version => {
  let diff = version;
  const major = Math.floor(diff / verionMajor);
  diff -= major * verionMajor;
  const minor =  Math.floor((diff ) / verionMinor);
  diff -= minor * verionMinor;
  const patch =  Math.floor((diff ) / verionPatch);
  return [ major, minor, patch]
}

export const sleep = (time) => {
  return new Promise(resolve => {
    setTimeout(resolve, time || 1000);
  });
}

export const exists = async file => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export const time = () => {
  const date = new Date();
  return `${padZero(date.getMonth() + 1)}/${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
}

const padZero = (num: any, len = 2) => {
  return ('0000' + num).slice(-len);
}

export const getIp = () => {
  const interfaces = networkInterfaces(); // 在开发环境中获取局域网中的本机iP地址
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (const alias of iface) {
      if (
        alias.family === 'IPv4' &&
        alias.address !== '127.0.0.1' &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
}