"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebFocusClient = void 0;
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
class WebFocusClient {
    client;
    cookies = "";
    baseUrl;
    constructor() {
        const config = vscode.workspace.getConfiguration('webfocus');
        this.baseUrl = config.get('baseUrl') || 'http://localhost:8080/webfocus';
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            validateStatus: () => true, // Handle 302/401 manually if needed
        });
    }
    async login() {
        const config = vscode.workspace.getConfiguration('webfocus');
        const username = config.get('username');
        const password = config.get('password');
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
        }
        catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    }
    async callApi(endpoint, method = 'GET', data) {
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
        }
        catch (error) {
            // If unauthorized, retry login once
            if (axios_1.default.isAxiosError(error) && error.response?.status === 401) {
                this.cookies = "";
                return this.callApi(endpoint, method, data);
            }
            throw error;
        }
    }
    async getSystemInfo() {
        return this.callApi('/oslo/1.0/rcaster/system');
    }
    async getSchedules() {
        // This might depend on the specific API available in the mocked or real environment
        return this.callApi('/oslo/1.0/rcaster/schedules');
    }
}
exports.WebFocusClient = WebFocusClient;
//# sourceMappingURL=webfocusApi.js.map