import nock from 'nock';
import { OsloClient } from '../src/osloClient';
import { OsloConfig } from '../src/types';

describe('OsloClient', () => {
    const config: OsloConfig = {
        baseUrl: 'http://test-webfocus:8080/webfocus',
        username: 'testuser',
        password: 'testpassword',
    };

    let client: OsloClient;

    beforeEach(() => {
        client = new OsloClient(config);
        nock.cleanAll();
    });

    it('should successfully login and set cookies', async () => {
        nock('http://test-webfocus:8080')
            .post('/webfocus/service/wf_security_check.jsp?IBIB_userid=testuser&IBIWF_rememberme=false&webfocus-security-direct-response=true&IBIB_password=testpassword')
            .reply(200, {}, { 'set-cookie': 'session=123' });

        const result = await client.login();
        expect(result).toBe(true);
    });

    it('should handle login failure', async () => {
        nock('http://test-webfocus:8080')
            .post(/.*/)
            .reply(401);

        const result = await client.login();
        expect(result).toBe(false);
    });

    it('should fetch system info with CSRF tokens', async () => {
        // Mock Login
        nock('http://test-webfocus:8080')
            .post(/.*/)
            .reply(200, {}, { 'set-cookie': 'session=123' });

        // Mock System Info
        nock('http://test-webfocus:8080')
            .get('/webfocus/oslo/1.0/system/info')
            .reply(200, {
                sessionInfo: {
                    csrfTokenName: 'X-CSRF-TOKEN',
                    csrfTokenValue: 'token-123'
                }
            });

        await client.init();

        // Mock a subsequent request to verify CSRF headers
        nock('http://test-webfocus:8080')
            .get('/webfocus/oslo/1.0/domains/')
            .matchHeader('X-CSRF-TOKEN', 'token-123')
            .matchHeader('Cookie', 'session=123')
            .reply(200, { domains: [] });

        const domains = await client.getDomains();
        expect(domains).toEqual({ domains: [] });
    });
});
