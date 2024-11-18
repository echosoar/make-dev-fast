import { BasePlugin } from '@midwayjs/command-core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getIp } from './utils';
const httpProxy = require('http-proxy');
const https = require('https');
const http = require('http');


export class ProxyPlugin extends BasePlugin {
  commands = {
    proxy: {
      usage: 'dev proxy',
      lifecycleEvents: [ 'do' ],
      passingCommand: true,
    },
  };

  hooks = {
    'proxy:do': this.hanldeproxy.bind(this),
  };

  async hanldeproxy() {
    const port = this.options.port || 12778;
    const ssl = this.options.ssl || false;
    const sslCert = this.options['ssl-cert'] || join(__dirname, '../static/default-cert.pem');
    const sslKey = this.options['ssl-key'] || join(__dirname, '../static/default-key.pem');
    let target = this.options.target || 'https://www.baidu.com';
    if (/^\d+$/.test(`${target}`)) {
      target = `http://127.0.0.1:${target}`;
    }
    const proxy = httpProxy.createProxyServer({
      target,
      changeOrigin: true,
    });
    const proxyCallback = function (req, res) {
      console.log(`- [${req.method} - ${req.url}]`);
      proxy.web(req, res);
    }

    if (ssl) {
      const options = {
        key: readFileSync(sslKey),
        cert: readFileSync(sslCert)
      };
      https.createServer(options, proxyCallback).listen(port);
      
    } else {
      http.createServer(proxyCallback).listen(port);
    }
    console.log(`[dev proxy server] started at http${ssl ? 's': ''}://127.0.0.1:${port}`);
    console.log(`[dev proxy server] started at http${ssl ? 's': ''}://${getIp()}:${port}`);
    console.log(`[dev proxy server] proxy to ${target}`);
    return new Promise(resolve => {});
  }
}
