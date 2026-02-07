import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

import { OsloClient } from './common/osloClient.js';

let serverProcess: cp.ChildProcess | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('IBI WebFOCUS MCP Extension is now active!');

    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("IBI WebFOCUS MCP Server");
    }

    // Command to start the MCP Server
    let startCommand = vscode.commands.registerCommand('ibi-webfocus.startMcpServer', async () => {
        if (serverProcess) {
            vscode.window.showInformationMessage('MCP Server is already running.');
            return;
        }

        const config = vscode.workspace.getConfiguration('webfocus');
        const baseUrl = config.get<string>('baseUrl') || 'http://localhost:8080/webfocus';
        const username = config.get<string>('username') || '';
        const password = config.get<string>('password') || '';

        const serverPath = path.join(context.extensionPath, 'dist', 'server.js');

        outputChannel?.appendLine(`Starting MCP Server from: ${serverPath}`);
        outputChannel?.show();

        try {
            serverProcess = cp.spawn('node', [serverPath], {
                env: {
                    ...process.env,
                    OSLO_BASE_URL: baseUrl,
                    OSLO_USERNAME: username,
                    OSLO_PASSWORD: password
                }
            });

            serverProcess.stdout?.on('data', (data) => {
                outputChannel?.append(data.toString());
            });

            serverProcess.stderr?.on('data', (data) => {
                outputChannel?.append(`[Error] ${data.toString()}`);
            });

            serverProcess.on('close', (code) => {
                outputChannel?.appendLine(`MCP Server process exited with code ${code}`);
                serverProcess = undefined;
            });

            vscode.window.showInformationMessage('IBI WebFOCUS MCP Server started.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start MCP Server: ${error}`);
        }
    });

    // Command to stop the MCP Server
    let stopCommand = vscode.commands.registerCommand('ibi-webfocus.stopMcpServer', async () => {
        if (!serverProcess) {
            vscode.window.showInformationMessage('MCP Server is not running.');
            return;
        }

        serverProcess.kill();
        serverProcess = undefined;
        vscode.window.showInformationMessage('IBI WebFOCUS MCP Server stopped.');
    });

    // Command to test WebFOCUS connection
    let testConnectionCommand = vscode.commands.registerCommand('ibi-webfocus.testConnection', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Testing WebFOCUS Connection...",
            cancellable: false
        }, async (progress) => {
            try {
                // Pick up latest config from settings
                const config = vscode.workspace.getConfiguration('webfocus');
                const baseUrl = config.get<string>('baseUrl') || 'http://localhost:8080/webfocus';
                const username = config.get<string>('username') || '';
                const password = config.get<string>('password') || '';

                const testClient = new OsloClient({
                    baseUrl,
                    username,
                    password
                });

                if (await testClient.login()) {
                    vscode.window.showInformationMessage('Successfully connected to WebFOCUS!');
                } else {
                    vscode.window.showErrorMessage('Failed to connect to WebFOCUS!');
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`WebFOCUS Connection Failed: ${error.message}`);
            }
        });
    });

    let mcpServerDefinitionProvider = vscode.lm.registerMcpServerDefinitionProvider('ibi-webfocus', {
        provideMcpServerDefinitions: async () => {
            const config = vscode.workspace.getConfiguration('webfocus');
            return [
                new vscode.McpStdioServerDefinition(
                    'IBI WebFOCUS MCP Server',
                    'node',
                    [context.asAbsolutePath('dist/server.js')],
                    {
                        OSLO_BASE_URL: config.get<string>('baseUrl') || 'http://localhost:8080/webfocus',
                        OSLO_USERNAME: config.get<string>('username') || '',
                        OSLO_PASSWORD: config.get<string>('password') || ''
                    }
                )
            ];
        }
    }
    )

    context.subscriptions.push(startCommand, stopCommand, testConnectionCommand, mcpServerDefinitionProvider);
}

export function deactivate() {
    if (serverProcess) {
        serverProcess.kill();
    }
}
