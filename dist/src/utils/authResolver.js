"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthResolver = void 0;
const buffer_1 = require("buffer");
const env_config_1 = require("../config/env.config");
const excelReader_1 = require("./excelReader");
const variableStore_1 = require("./variableStore");
class AuthResolver {
    static async resolve(authRef, request) {
        const credential = excelReader_1.ExcelReader.getAuthCredential(authRef || 'AUTH_NONE');
        if (!credential)
            return { authType: 'None', headers: {} };
        const authType = String(credential.AuthType || 'None').trim();
        if (!this.isActive(credential))
            return { authType: `${authType} (inactive)`, headers: {} };
        switch (authType.toLowerCase()) {
            case 'none':
                return { authType, headers: {} };
            case 'basic':
                return { authType, headers: this.basic(credential) };
            case 'bearer':
                return { authType, headers: this.bearer(credential.Token) };
            case 'api key':
            case 'apikey':
                return { authType, headers: this.apiKey(credential) };
            case 'oauth2':
                return { authType, headers: await this.oauth2(credential, request) };
            case 'hmac':
                return { authType, headers: this.apiKey(credential) };
            default:
                return { authType: `${authType} (unhandled)`, headers: {} };
        }
    }
    static basic(credential) {
        const username = env_config_1.EnvConfig.resolveSecretOrValue(credential.Username);
        const password = env_config_1.EnvConfig.resolveSecretOrValue(credential.Password);
        const encoded = buffer_1.Buffer.from(`${username}:${password}`).toString('base64');
        return { Authorization: `Basic ${encoded}` };
    }
    static bearer(token) {
        const resolvedToken = variableStore_1.VariableStore.resolve(env_config_1.EnvConfig.resolveSecretOrValue(token));
        return resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {};
    }
    static apiKey(credential) {
        const apiKey = env_config_1.EnvConfig.resolveSecretOrValue(credential.APIKey);
        return apiKey ? { 'x-api-key': apiKey } : {};
    }
    static async oauth2(credential, request) {
        const configId = String(credential.Token || credential.APIKey || '').trim();
        const oauthConfig = excelReader_1.ExcelReader.getOAuth2Config(configId);
        if (!oauthConfig) {
            return this.bearer(credential.Token);
        }
        const token = oauthConfig.AccessToken
            ? env_config_1.EnvConfig.resolveSecretOrValue(oauthConfig.AccessToken)
            : await this.fetchOAuth2Token(oauthConfig, request);
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
    static async fetchOAuth2Token(config, request) {
        if (!config.TokenURL)
            return '';
        const response = await request.post(String(config.TokenURL), {
            form: {
                grant_type: String(config.GrantType || 'client_credentials'),
                client_id: env_config_1.EnvConfig.resolveSecretOrValue(config.ClientID),
                client_secret: env_config_1.EnvConfig.resolveSecretOrValue(config.ClientSecret, true),
                scope: env_config_1.EnvConfig.resolveSecretOrValue(config.Scope)
            }
        });
        const body = await response.json().catch(() => ({}));
        const accessToken = body.access_token ? String(body.access_token) : '';
        if (accessToken)
            variableStore_1.VariableStore.set('OAUTH_ACCESS_TOKEN', accessToken);
        return accessToken;
    }
    static isActive(credential) {
        const value = credential.IsActive;
        if (value === undefined || value === null || value === '')
            return true;
        return !['false', 'no', '0', 'inactive'].includes(String(value).trim().toLowerCase());
    }
}
exports.AuthResolver = AuthResolver;
