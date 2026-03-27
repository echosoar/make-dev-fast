import { BasePlugin } from '@midwayjs/command-core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getIp } from './utils';
const httpProxy = require('http-proxy');
const https = require('https');
const http = require('http');
const http2 = require('http2');


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
    const http2Enabled = this.options.http2 || false;
    const sslCert = this.options['ssl-cert'] || join(__dirname, '../static/default-cert.pem');
    const sslKey = this.options['ssl-key'] || join(__dirname, '../static/default-key.pem');
    let target = this.options.target || 'https://www.baidu.com';
    if (/^\d+$/.test(`${target}`)) {
      target = `http://127.0.0.1:${target}`;
    }

    if (http2Enabled) {
      // HTTP/2 requires SSL/TLS
      const options = {
        key: readFileSync(sslKey),
        cert: readFileSync(sslCert),
        allowHTTP1: true
      };
      const server = http2.createSecureServer(options);
      
      // Headers that are not allowed in HTTP/2
      const forbiddenHeaders = [
        'connection',
        'keep-alive',
        'proxy-connection',
        'transfer-encoding',
        'upgrade'
      ];
      
      // Handle HTTP/2 streams
      server.on('stream', (stream, headers) => {
        // Extract HTTP/2 pseudo-headers
        const method = headers[':method'];
        const path = headers[':path'];
        const authority = headers[':authority'];
        
        console.log(`- [${method} - ${path}]`);
        
        // Prepare request headers for backend
        const requestHeaders = {};
        for (const name in headers) {
          if (!name.startsWith(':')) {
            requestHeaders[name] = headers[name];
          }
        }
        
        // Ensure host header exists
        if (!requestHeaders.host && authority) {
          requestHeaders.host = authority;
        }
        
        // Parse target URL
        const targetUrl = new URL(target);
        const isSecure = targetUrl.protocol === 'https:';
        const backendModule = isSecure ? https : http;
        
        // Make request to backend
        const backendReq = backendModule.request({
          hostname: targetUrl.hostname,
          port: targetUrl.port || (isSecure ? 443 : 80),
          path: path,
          method: method,
          headers: requestHeaders
        }, (backendRes) => {
          // Send response headers to client
          const responseHeaders = { ':status': backendRes.statusCode };
          
          // Filter out forbidden HTTP/2 headers
          for (const name in backendRes.headers) {
            if (!forbiddenHeaders.includes(name.toLowerCase())) {
              responseHeaders[name] = backendRes.headers[name];
            }
          }
          
          stream.respond(responseHeaders);
          
          // Pipe response body to client
          backendRes.pipe(stream);
        });
        
        // Handle errors
        backendReq.on('error', (err) => {
          console.error('Backend request error:', err.message);
          if (!stream.headersSent) {
            stream.respond({ ':status': 502 });
          }
          stream.end('Bad Gateway');
        });
        
        // Pipe request body to backend
        stream.pipe(backendReq);
      });
      
      // Handle HTTP/1.1 requests (when allowHTTP1 is true)
      const proxy = httpProxy.createProxyServer({
        target,
        changeOrigin: true,
      });
      
      server.on('request', (req, res) => {
        // Only handle if it's truly HTTP/1.1 (not HTTP/2 compatibility mode)
        // In HTTP/2 compatibility mode, httpVersion will be '2.0'
        if (req.httpVersion === '2.0' || req.httpVersionMajor === 2) {
          // This is an HTTP/2 request in compatibility mode, ignore it
          // as it's already handled by the 'stream' event
          return;
        }
        console.log(`- [${req.method} - ${req.url}]`);
        proxy.web(req, res);
      });
      
      server.listen(port);
      console.log(`[dev proxy server] started at https://127.0.0.1:${port} (HTTP/2)`);
      console.log(`[dev proxy server] started at https://${getIp()}:${port} (HTTP/2)`);
    } else {
      // Regular HTTP/1.1 proxy using http-proxy
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
        console.log(`[dev proxy server] started at https://127.0.0.1:${port}`);
        console.log(`[dev proxy server] started at https://${getIp()}:${port}`);
      } else {
        http.createServer(proxyCallback).listen(port);
        console.log(`[dev proxy server] started at http://127.0.0.1:${port}`);
        console.log(`[dev proxy server] started at http://${getIp()}:${port}`);
      }
    }
    console.log(`[dev proxy server] proxy to ${target}`);
    return new Promise(resolve => {});
  }
}
