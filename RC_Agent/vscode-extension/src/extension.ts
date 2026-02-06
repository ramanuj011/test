import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

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
        const { WebFocusClient } = await import('./webfocusApi.js');
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Testing WebFOCUS Connection...",
            cancellable: false
        }, async (progress) => {
            try {
                // Re-instantiate client to pick up latest config
                const testClient = new WebFocusClient();
                await testClient.testConnection();
                vscode.window.showInformationMessage('Successfully connected to WebFOCUS!');
            } catch (error: any) {
                vscode.window.showErrorMessage(`WebFOCUS Connection Failed: ${error.message}`);
            }
        });
    });

    context.subscriptions.push(startCommand, stopCommand, testConnectionCommand);
}

export function deactivate() {
    if (serverProcess) {
        serverProcess.kill();
    }
}
