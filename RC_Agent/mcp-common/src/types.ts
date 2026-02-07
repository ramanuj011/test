export interface OsloConfig {
    baseUrl: string;
    username?: string;
    password?: string;
    timeout?: number;
}

export interface SessionInfo {
    csrfTokenName: string;
    csrfTokenValue: string;
}

export interface SystemInfoResponse {
    sessionInfo: SessionInfo;
    [key: string]: any;
}

export interface DomainOptions {
    pageSize?: number;
    timeout?: number;
}
