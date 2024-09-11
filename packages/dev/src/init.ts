import { BasePlugin } from '@midwayjs/command-core';
import fetch from 'node-fetch';
import * as enquirer from 'enquirer';
import Spin from 'light-spinner';
import { join } from 'path';
import { createWriteStream, existsSync } from 'fs';
import { exec, exists } from './utils';
import { tmpdir } from 'os';
import { ensureDir, copy } from 'fs-extra';
const globby = require('globby');
export class InitPlugin extends BasePlugin {
  commands = {
    init: {
      usage: 'dev init',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
    },
  };

  hooks = {
    'init:do': this.hanldeLocalServer.bind(this),
  };

  async hanldeLocalServer() {
    // get template list
    const data = await fetch('https://unpkg.com/make-dev-fast-tpl-list@latest/package.json').then(res => res.json());
    const { list } = data;
    const name = await (enquirer as any).input({
        message: 'Please input dir name (use "./" to initialize in the current directory)',
    });
    let dir = join(this.core.cwd, name);
    if (name === './') {
      dir = this.core.cwd;
    }
    if (await exists(dir) && (name && name !== './')) {
        console.error(`Error: dir ${name} is exists. (${dir})`);
        return;
    }
    console.log(`project will create to ${dir}`);
    await ensureDir(dir);
    const template = await (enquirer as any).autocomplete({
        name: 'template',
        message: 'Please select the template',
        choices: list.map(item => {
            return {
                name: item.name,
            };
        })
    });

    const templateInfo = list.find(item => item.name === template);
    const spin = new Spin({
        text: 'Download template...',
    });
    spin.start();
    const templateVersion = (await fetch(`https://unpkg.com/${templateInfo.target}@latest/package.json`).then(res => res.json())).version;
    // 下载模板
    const file = join(tmpdir(), `mdf_tpl_${Date.now()}.tgz`);
    const writeFileStream = createWriteStream(file);
    await new Promise((resolve) => {
        fetch(`https://registry.npmmirror.com/${templateInfo.target}/-/${templateInfo.target}-${templateVersion}.tgz`).then(res => {
            res.body.on('end', resolve);
            res.body.pipe(writeFileStream);
        });
    });
    
    const targetDir = file.replace('.tgz', '_dir');
    await ensureDir(targetDir);
    // TODO: unzip
    await exec(`tar -zxvf ${file} -C ${targetDir}`);
    const templateDir = join(targetDir, 'package/template');
    spin.stop();

    const paths = await globby('**/*', {
      cwd: templateDir
    });
    for(const path of paths) {
      const origin = join(templateDir, path);
      let targetPath = path.replace(/^dot./, '.');
      const target = join(dir, targetPath);
      if (!existsSync(target)) {
        await copy(origin, target);
      }
    }

    console.log();
    console.log(`Success init project at ${dir}`);
  }
}
