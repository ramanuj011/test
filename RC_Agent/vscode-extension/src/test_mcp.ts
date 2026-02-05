import { spawn } from 'child_process';
import * as path from 'path';

const extensionPath = path.resolve(__dirname, '../dist/extension.js');

console.log('--- Testing MCP Server via Stdio ---');
console.log('Running:', extensionPath);

const child = spawn('node', [extensionPath]);

child.stdout.on('data', (data) => {
    console.log('OUTPUT:', data.toString());
});

child.stderr.on('data', (data) => {
    console.error('ERROR:', data.toString());
});

// Send initialize request
const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '1.0.0',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
    }
};

console.log('SENDING:', JSON.stringify(initRequest));
child.stdin.write(JSON.stringify(initRequest) + '\n');

setTimeout(() => {
    const listToolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
    };
    console.log('SENDING:', JSON.stringify(listToolsRequest));
    child.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

setTimeout(() => {
    child.kill();
    process.exit(0);
}, 3000);
