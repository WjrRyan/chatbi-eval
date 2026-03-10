#!/usr/bin/env node

/**
 * 简单的 CORS 代理服务器
 * 用于解决浏览器直接调用 API 的跨域问题
 *
 * 使用方法:
 *   node proxy-server.js
 *
 * 然后在浏览器中访问: http://localhost:3000
 */

const http = require('http');

const TARGET_HOST = 'tdify.fat0.qa.nt.ctripcorp.com';
const TARGET_PORT = 80;
const PROXY_PORT = 3000;

const server = http.createServer((req, res) => {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 静态文件服务 - 提供 index.html
    if (req.method === 'GET' && req.url === '/') {
        const fs = require('fs');
        const path = require('path');
        const htmlPath = path.join(__dirname, 'index.html');

        fs.readFile(htmlPath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    // API 代理 - 转发 /api/* 请求到目标服务器
    if (req.method === 'POST' && req.url.startsWith('/api/')) {
        const targetPath = req.url.substring(4); // 移除 /api/ 前缀

        // 准备请求体
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            const options = {
                hostname: TARGET_HOST,
                port: TARGET_PORT,
                path: '/' + targetPath,
                method: 'POST',
                headers: {
                    'Content-Type': req.headers['content-type'] || 'application/json',
                    'Authorization': req.headers['authorization'] || '',
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            console.log(`[Proxy] ${req.method} /${targetPath} -> http://${TARGET_HOST}/${targetPath}`);

            const proxyReq = http.request(options, (proxyRes) => {
                let proxyBody = '';
                proxyRes.on('data', chunk => {
                    proxyBody += chunk.toString();
                });

                proxyRes.on('end', () => {
                    console.log(`[Proxy] Response: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
                    res.writeHead(proxyRes.statusCode, {
                        'Content-Type': 'application/json'
                    });
                    res.end(proxyBody);
                });
            });

            proxyReq.on('error', (err) => {
                console.error('[Proxy] Error:', err.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
            });

            proxyReq.write(body);
            proxyReq.end();
        });

        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PROXY_PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║           CORS 代理服务器已启动                        ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  在浏览器中打开: http://localhost:${PROXY_PORT}           ║`);
    console.log('║                                                       ║');
    console.log('║  API 地址请填写:                                      ║');
    console.log(`║  http://localhost:${PROXY_PORT}/api/v1/chat-messages       ║`);
    console.log('║                                                       ║');
    console.log('║  按 Ctrl+C 停止服务器                                  ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
});
