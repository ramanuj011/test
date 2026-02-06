import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';
import { OsloConfig, SystemInfoResponse, DomainOptions } from './types';

export class OsloClient {
    private client: AxiosInstance;
    private cookies: string = "";
    private csrfTokenName: string = "";
    private csrfTokenValue: string = "";
    private config: OsloConfig;

    constructor(config: OsloConfig) {
        this.config = config;
        this.client = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000,
            validateStatus: () => true, // We handle errors manually
        });
    }

    public static fromEnv(): OsloClient {
        return new OsloClient({
            baseUrl: process.env.OSLO_BASE_URL || 'http://localhost:8080/webfocus',
            username: process.env.OSLO_USERNAME,
            password: process.env.OSLO_PASSWORD,
        });
    }

    public async login(): Promise<boolean> {
        const { username, password } = this.config;
        if (!username || !password) {
            logger.error("Login failed: Username or password not configured.");
            return false;
        }

        const loginUrl = `/service/wf_security_check.jsp?IBIB_userid=${username}&IBIWF_rememberme=false&webfocus-security-direct-response=true&IBIB_password=${password}`;

        try {
            logger.info("Attempting to login to Oslo...");
            const response = await this.client.post(loginUrl);

            if (response.status !== 200) {
                logger.error(`Login failed with status ${response.status}`);
                return false;
            }

            const setCookie = response.headers['set-cookie'];
            if (setCookie) {
                this.cookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
                logger.info("Successfully logged in and retrieved cookies.");
                return true;
            }

            logger.warn("Login response did not contain cookies.");
            return false;
        } catch (error: any) {
            logger.error("Login error:", error.message);
            return false;
        }
    }

    public async init(): Promise<void> {
        try {
            const systemInfo = await this.getSystemInfo();
            if (systemInfo?.sessionInfo) {
                this.csrfTokenName = systemInfo.sessionInfo.csrfTokenName;
                this.csrfTokenValue = systemInfo.sessionInfo.csrfTokenValue;
                logger.info(`CSRF initialized: ${this.csrfTokenName}`);
            }
        } catch (error: any) {
            logger.warn("Failed to initialize CSRF tokens from system info:", error.message);
        }
    }

    private async request(url: string, method: 'GET' | 'POST' | 'DELETE' | 'PUT' = 'GET', data?: any): Promise<any> {
        if (!this.cookies) {
            const success = await this.login();
            if (!success) throw new Error("Authentication failed");
        }

        const headers: any = {
            'Cookie': this.cookies,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        if (this.csrfTokenName && this.csrfTokenValue) {
            headers[this.csrfTokenName] = this.csrfTokenValue;
        }

        try {
            const response = await this.client.request({
                url,
                method,
                data,
                headers
            });

            if (response.status === 401) {
                logger.info("Session expired, retrying login...");
                this.cookies = "";
                return this.request(url, method, data);
            }

            if (response.status >= 400) {
                throw new Error(`API error ${response.status}: ${JSON.stringify(response.data)}`);
            }

            return response.data;
        } catch (error: any) {
            logger.error(`Request failed: ${method} ${url}`, error.message);
            throw error;
        }
    }

    public async getSystemInfo(): Promise<SystemInfoResponse> {
        return this.request('/oslo/1.0/system/info');
    }

    public async getCasterSystemInfo(handleOrPath?: string): Promise<any> {
        const path = handleOrPath ? `?folderId=${this.preprocessItemPath(handleOrPath)}` : '';
        return this.request(`/oslo/1.0/rcaster/system${path}`);
    }

    public async getDomains(options: DomainOptions = {}): Promise<any> {
        let url = '/oslo/1.0/domains/';
        if (options.pageSize) url += `?page[size]=${options.pageSize}`;
        return this.request(url);
    }

    public async getMyWorkspace(options: DomainOptions = {}): Promise<any> {
        let url = '/oslo/1.0/domains/myworkspace';
        if (options.pageSize) url += `?page[size]=${options.pageSize}`;
        return this.request(url);
    }

    public async getRecents(): Promise<any> {
        return this.request('/oslo/1.0/domains/recents');
    }

    public async getReportCasterStatus(): Promise<any> {
        return this.request('/oslo/1.0/health/rcaster');
    }

    public async testGoogleChatConnection(config: any): Promise<any> {
        return this.request('/oslo/1.0/messaging/googlechat/test', 'POST', config);
    }

    public async getMessagingProfiles(): Promise<any> {
        return this.request('/oslo/1.0/messaging/profiles');
    }

    public async getUserGroupLists(): Promise<any> {
        return this.request('/oslo/1.0/rcaster/accesslist/usergroup/list');
    }

    public async getAccessLists(): Promise<any> {
        return this.request('/oslo/1.0/rcaster/accesslists');
    }

    public async deleteJobLogs(logIds: string[]): Promise<any> {
        return this.request('/oslo/1.0/rcaster/job/logs', 'DELETE', logIds);
    }

    public async getFeatureList(): Promise<any> {
        return this.request('/oslo/1.0/system/feature/list');
    }

    private preprocessItemPath(idItem: string, uriEncode: boolean = true): string {
        if (this.isPath(idItem)) {
            const encoded = uriEncode ? encodeURIComponent(idItem) : idItem;
            return btoa(encoded).replaceAll('+', '-').replaceAll('/', '_');
        }
        return idItem;
    }

    private isPath(idItem: string): boolean {
        return idItem.includes('/') || idItem.includes('\\');
    }
}
