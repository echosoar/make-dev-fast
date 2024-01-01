import { BasePlugin } from '@midwayjs/command-core';
import fetch from 'node-fetch';
import * as enquirer from 'enquirer';
import Spin from 'light-spinner';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { exists } from './utils';
import { tmpdir } from 'os';
import { ensureDir } from 'fs-extra';
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
    const data = await fetch('https://registry.npmmirror.com/make-dev-fast-tpl-list/latest/files/package.json').then(res => res.json());
    const { list } = data;
    const name = await (enquirer as any).input({
        message: 'Please input dir name',
    });
    const dir = join(this.core.cwd, name);
    if (await exists(dir)) {
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
    const templateVersion = (await fetch(`https://registry.npmmirror.com/${templateInfo.target}/latest/files/package.json`).then(res => res.json())).version;
    // 下载模板
    const file = join(tmpdir(), `mdf_tpl_${Date.now()}.zip`);
    const writeFileStream = createWriteStream(file);
    await new Promise((resolve) => {
        fetch(`https://registry.npmmirror.com/${templateInfo.target}/-/${templateInfo.target}-${templateVersion}.tgz`).then(res => {
            res.body.on('end', resolve);
            res.body.pipe(writeFileStream);
        });
    });

    
    console.log('template', file);
    // TODO: unzip
  }
}
