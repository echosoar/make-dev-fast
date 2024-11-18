import { BasePlugin } from '@midwayjs/command-core';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { getIp, time } from './utils';
const koa = require('koa');
const koaStatic = require('koa-static');
const https = require('https');
const http = require('http');

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
    const ssl = this.options.ssl || false;
    const sslCert = this.options['ssl-cert'] || join(__dirname, '../static/default-cert.pem');
    const sslKey = this.options['ssl-key'] || join(__dirname, '../static/default-key.pem');

    const app = new koa();
    app.use((ctx, next) => {
      ctx.set('Access-Control-Allow-Origin', '*');
      ctx.set('Access-Control-Allow-Headers', ctx.request.headers['access-control-request-headers'] || 'Content-Type');
      if (ctx.request.method.toLowerCase() === 'options') {
        ctx.body = 'success';
        return;
      }
      const path = ctx.request.url;
      console.log(`- [${ctx.request.method} - ${time()}] ${path}`);
      return next();
    });
    app.use(koaStatic(baseDir));
    app.use((ctx, next) => {
      const path = ctx.request.url;
      const absolutePath = join(baseDir, '.' + path);
      if (!absolutePath.endsWith(path)) {
        ctx.body = 'forbidden path';
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
              return `<a href="${filePath}">${  filePath }</a>`
            })
          ].join('<br />');
          return;
        }
      } else if (this.options.spa) {
        const homePage = join(baseDir, 'index.html');
        if (existsSync(homePage)) {
          ctx.type = 'html';
          ctx.body = readFileSync(homePage);
          return;
        }
        ctx.status = 404;
        ctx.body = 'Index page not found';
        return;
      }
      return next();
    });

    if (ssl) {
      const options = {
        key: readFileSync(sslKey),
        cert: readFileSync(sslCert)
      };
      https.createServer(options, app.callback()).listen(port);
      console.log(`[dev static server] started at https://127.0.0.1:${port}`);
      console.log(`[dev static server] started at https://${getIp()}:${port}`);
    } else {
      http.createServer(app.callback()).listen(port);
      console.log(`[dev static server] started at http://127.0.0.1:${port}`);
      console.log(`[dev static server] started at http://${getIp()}:${port}`);
    }

    return new Promise(resolve => {});
  }
}
