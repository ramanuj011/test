import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';

export class WebFocusClient {
    private client: AxiosInstance;
    private cookies: string = "";
    private baseUrl: string;

    constructor() {
        const config = vscode.workspace.getConfiguration('webfocus');
        this.baseUrl = config.get<string>('baseUrl') || 'http://localhost:8080/webfocus';
        this.client = axios.create({
            baseURL: this.baseUrl,
            validateStatus: () => true, // Handle 302/401 manually if needed
        });
    }

    private async login(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('webfocus');
        const username = config.get<string>('username');
        const password = config.get<string>('password');

        if (!username || !password) {
            vscode.window.showErrorMessage('WebFOCUS credentials not configured.');
            return false;
        }

        const loginUrl = `${this.baseUrl}/service/wf_security_check.jsp?IBIB_userid=${username}&IBIWF_rememberme=false&webfocus-security-direct-response=true&IBIB_password=${password}`;

        try {
            const response = await this.client.post(loginUrl);
            const setCookie = response.headers['set-cookie'];
            if (setCookie) {
                this.cookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    }

    public async callApi(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<any> {
        if (!this.cookies) {
            const success = await this.login();
            if (!success) {
                throw new Error('Failed to login to WebFOCUS');
            }
        }

        try {
            const response = await this.client.request({
                url: endpoint,
                method,
                data,
                headers: {
                    'Cookie': this.cookies
                }
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
        // This might depend on the specific API available in the mocked or real environment
        return this.callApi('/oslo/1.0/rcaster/schedules');
    }
}
