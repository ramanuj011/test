import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';

export interface WebFocusConfig {
    baseUrl: string;
    username?: string;
    password?: string;
}

export class WebFocusClient {
    private client: AxiosInstance;
    private cookies: string = "";
    private csrfTokenName: string = "";
    private csrfTokenValue: string = "";
    private baseUrl: string;
    private config?: WebFocusConfig;

    constructor(config?: WebFocusConfig) {
        if (config) {
            this.config = config;
            this.baseUrl = config.baseUrl;
        } else {
            // Fallback to VS Code config if available via global/env or handled in login
            try {
                const vscode = require('vscode');
                const workspaceConfig = vscode.workspace.getConfiguration('webfocus');
                this.baseUrl = workspaceConfig.get('baseUrl') || 'http://localhost:8080/webfocus';
            } catch (e) {
                this.baseUrl = process.env.OSLO_BASE_URL || 'http://localhost:8080/webfocus';
            }
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            validateStatus: () => true,
        });
    }

    private async login(): Promise<boolean> {
        let username = this.config?.username;
        let password = this.config?.password;

        if (!username || !password) {
            try {
                const vscode = require('vscode');
                const workspaceConfig = vscode.workspace.getConfiguration('webfocus');
                username = username || workspaceConfig.get('username');
                password = password || workspaceConfig.get('password');
            } catch (e) {
                username = username || process.env.OSLO_USERNAME;
                password = password || process.env.OSLO_PASSWORD;
            }
        }

        if (!username || !password) {
            console.error('WebFOCUS credentials not configured.');
            return false;
        }

        const loginUrl = `${this.baseUrl}/service/wf_security_check.jsp?IBIB_userid=${username}&IBIWF_rememberme=false&webfocus-security-direct-response=true&IBIB_password=${password}`;

        try {
            const response = await this.client.post(loginUrl);
            const setCookie = response.headers['set-cookie'];
            if (setCookie) {
                this.cookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;

                // Fetch CSRF tokens after login
                const sysInfoResponse = await this.client.get(`${this.baseUrl}/oslo/1.0/system/info`, {
                    headers: { 'Cookie': this.cookies }
                });
                const sessionInfo = sysInfoResponse.data?.sessionInfo;
                if (sessionInfo) {
                    this.csrfTokenName = sessionInfo.csrfTokenName;
                    this.csrfTokenValue = sessionInfo.csrfTokenValue;
                }

                return true;
            }
            return false;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    }

    public async callApi(endpoint: string, method: 'GET' | 'POST' | 'DELETE' | 'PUT' = 'GET', data?: any): Promise<any> {
        if (!this.cookies) {
            const success = await this.login();
            if (!success) {
                throw new Error('Failed to login to WebFOCUS');
            }
        }

        try {
            const headers: any = {
                'Cookie': this.cookies
            };
            if (this.csrfTokenName && this.csrfTokenValue) {
                headers[this.csrfTokenName] = this.csrfTokenValue;
            }

            const response = await this.client.request({
                url: endpoint,
                method,
                data,
                headers
            });
            return response.data;
        } catch (error) {
            // If unauthorized, retry login once
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                this.cookies = "";
                return this.callApi(endpoint, method, data);
            }
            throw error;
        }
    }

    public async getSystemInfo(): Promise<any> {
        return this.callApi('/oslo/1.0/rcaster/system');
    }

    public async getSchedules(): Promise<any> {
        return this.callApi('/oslo/1.0/rcaster/schedules');
    }

    public async getDomains(): Promise<any> {
        return this.callApi('/oslo/1.0/domains/');
    }

    public async getMyWorkspace(): Promise<any> {
        return this.callApi('/oslo/1.0/domains/myworkspace');
    }

    public async getRecents(): Promise<any> {
        return this.callApi('/oslo/1.0/domains/recents');
    }

    public async getReportCasterStatus(): Promise<any> {
        return this.callApi('/oslo/1.0/health/rcaster');
    }

    public async testGoogleChatConnection(config: any): Promise<any> {
        return this.callApi('/oslo/1.0/messaging/googlechat/test', 'POST', config);
    }

    public async getMessagingProfiles(): Promise<any> {
        return this.callApi('/oslo/1.0/messaging/profiles');
    }

    public async getUserGroupLists(): Promise<any> {
        return this.callApi('/oslo/1.0/rcaster/accesslist/usergroup/list');
    }

    public async getAccessLists(): Promise<any> {
        return this.callApi('/oslo/1.0/rcaster/accesslists');
    }

    public async deleteJobLogs(logIds: string[]): Promise<any> {
        return this.callApi('/oslo/1.0/rcaster/job/logs', 'DELETE', logIds);
    }

    public async getFeatureList(): Promise<any> {
        return this.callApi('/oslo/1.0/system/feature/list');
    }

    public async testConnection(): Promise<boolean> {
        try {
            // Attempt to get system info, which triggers login if needed
            await this.getSystemInfo();
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }
}
