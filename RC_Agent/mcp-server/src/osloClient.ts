import axios from 'axios';

const OSLO_USERNAME = process.env.OSLO_USERNAME || 'secret';
const OSLO_PASSWORD = process.env.OSLO_PASSWORD || 'terces';
const OSLO_BASE_URL = process.env.OSLO_BASE_URL || 'http://localhost:8080/webfocus';
const OSLO_API_URL = `${OSLO_BASE_URL}/oslo/1.0`;
const OSLO_LOGIN_URL = `${OSLO_BASE_URL}/service/wf_security_check.jsp?IBIB_userid=${OSLO_USERNAME}&IBIWF_rememberme=false&webfocus-security-direct-response=true&IBIB_password=${OSLO_PASSWORD}`;

export class OsloClient {
    private static cookies: string = "";
    static _csrfTokenValue: any;
    static _csrfTokenName: any;

    //If you don't know the csrf tokens, and such...then you can call this and it can be retrieved from
    //the system info.
    static async init() {
        var systemInfo: any = await this.SystemInfo();
        this._csrfTokenName = systemInfo.sessionInfo.csrfTokenName;
        this._csrfTokenValue = systemInfo.sessionInfo.csrfTokenValue;
        console.log("CSRF Token Name", this._csrfTokenName);
        console.log("CSRF Token Value", this._csrfTokenValue);
    };
    static async login() {
        try {
            console.log("Logging into Oslo...");
            console.log("OSLO_LOGIN_URL", OSLO_LOGIN_URL);
            const response = await axios.post(OSLO_LOGIN_URL, {
                validateStatus: () => true, // Accept all status codes to see headers
            });
            const setCookie = response.headers['set-cookie'];
            if (setCookie) {
                console.log("Cookies received:", setCookie);
                this.cookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
                console.log("Successfully logged in and retrieved cookies.");
            } else {
                console.warn("Login response did not contain cookies.");
            }
        } catch (error) {
            console.error("Failed to login to Oslo:", error);
        }
    }

    static SystemInfo = async (options: any = { timeout: null }) => {
        options = { ...this.defCallOptions, ...options }
        if (!options.headers) options.headers = {};
        options.headers.Cookie = this.cookies;
        return await OsloClient.fetchWithTimeout(`${OSLO_API_URL}/system/info`, options, options.timeout).then(response => response.json());
    }
    static getCookies() {
        return this.cookies;
    }

    /**
     * 
     * @param idItem 
     * @param uriEncode 
     * @returns 
     */
    static preprocessItemPath = (idItem: string, uriEncode: boolean = true) => {
        return OsloClient.isPath(idItem) ? btoa(uriEncode ? encodeURIComponent(idItem) : idItem).replaceAll('+', '-').replaceAll('/', '_') : idItem;
    }
    static isPath = (idItem: string) => {
        return idItem.includes('/') || idItem.includes('\\');
    }

    /**
     * 
     * @param resource 
     * @param options 
     * @param timeout 
     * @returns 
     */
    static fetchWithTimeout = async (resource: string, options: any = {}, timeout: any) => {
        if (options && options.headers) options.headers.Cookie = this.cookies;
        //timeout can be an AbortController the caller controls, or just a milisecond value for a default timeout.
        if (timeout !== null) {
            const ac = timeout instanceof AbortController ? timeout : new AbortController();
            options.signal = ac.signal;
            if (!isNaN(timeout))
                setTimeout(() => ac.abort(), timeout);
        }
        const result = await fetch(resource, options);
        if (!result.ok) {
            throw new Error("OSLO Fetch Error", { cause: result }); //use await e.cause.json(); in your catch block
        }
        return result;
    }

    //Calls that take options will merge passed object with these.
    private static defCallOptions: any = {
        /* general */
        rawPayload: false,
        timeout: null,
        headers: {},

        /* domains.put */
        encode: false,
        container: false,
        overWrite: true,
        privateToUser: true,

        /* system */
        withStatus: false, //used by nodeList

        /* domains.run/domains.adhoc */
        urlOnly: false,

        /* search.advanced */
        searchCategory: ["*"],
        searchTypes: ["*"],
        searchExcludeExt: [".man"],
        searchIncludeOnlyExt: ["*"],
        searchWorkspaces: "*",
        searchRSWithApps: {},

        /* deferred calls flags */
        doDelete: false, //used by deleteAutoanalyticsDefer  
    }

    /**
     * 
     * @param handleOrPath 
     * @param options 
     * @returns 
     */
    static getCasterSystemInfo = async (handleOrPath: string, options: any = {}) => {
        let url = `${OSLO_API_URL}/rcaster/system${handleOrPath ? `?folderId=${OsloClient.preprocessItemPath(handleOrPath)}` : ''}`;
        return await OsloClient.fetchWithTimeout(`${url}`, {
            method: 'GET',
            headers: {
                [this._csrfTokenName]: this._csrfTokenValue,
                Accept: 'application/json', 'Content-Type': 'application/json'
            },
        }, options.timeout).then(response => response.json());
    }

    /**
     * 
     * @returns 
     */
    static getSystemInfo_bkp() {
        const endPoint = '/rcaster/system';
        return this.makeCall(endPoint, "GET");
    }
    /**
     * 
     * @param endpoint 
     * @param method 
     * @returns 
     */
    static async makeCall(endpoint: string, method: string) {
        console.log("Making Oslo call...");
        if (this.cookies.length === 0) {
            await this.login();
        }
        if ("GET" == method) {
            const response = await axios.get(OSLO_API_URL + endpoint, {
                headers: {
                    Cookie: this.cookies
                }
            });
            return response.data;
        } else if ("POST" == method) {
            const response = await axios.post(OSLO_API_URL + endpoint, {
                headers: {
                    Cookie: this.cookies
                }
            });
            return response.data;
        }
    }

}
