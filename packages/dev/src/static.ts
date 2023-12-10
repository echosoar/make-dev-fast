import { BasePlugin } from '@midwayjs/command-core';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getIp, time } from './utils';
const koa = require('koa');
const koaStatic = require('koa-static');
export class StaticServerPlugin extends BasePlugin {
  commands = {
    static: {
      usage: 'dev static',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
    },
  };

  hooks = {
    'static:do': this.hanldeLocalServer.bind(this),
  };

  async hanldeLocalServer() {
    const port = this.options.port || 12777;
    const baseDir = this.options.dir || process.cwd();
    const app = new koa();
    app.use((ctx, next) => {
      const path = ctx.request.url;
      console.log(`- [${ctx.request.method} - ${time()}] ${path}`);
      return next();
    });
    app.use(koaStatic(baseDir));
    app.use((ctx, next) => {
      const path = ctx.request.url;
      const absolutePath = join(baseDir, '.' + path);
      if (!absolutePath.endsWith(path)) {
        ctx.body = 'forbiden path';
        return;
      }
      const exists = existsSync(absolutePath);
      if (exists) {
        const statInfo = statSync(absolutePath);
        if (statInfo.isDirectory()) {
          const dirList = readdirSync(absolutePath);
          ctx.type = 'html';
          ctx.body = [
            '<h2>404</h2>',
            '<hr />',
            ...dirList.map(file => {
              const filePath = join(path, file)
              return `<a href="${filePath.replace(/^\//, '')}">${  filePath }</a>`
            })
          ].join('<br />');
          return;
        }
      }
      return next();
    });
    app.listen(port);
    
    console.log(`[dev static server] started at http://127.0.0.1:${port}`);
    console.log(`[dev static server] started at http://${getIp()}:${port}`);
    return new Promise(resolve => {});
  }
}
