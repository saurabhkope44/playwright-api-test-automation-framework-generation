import { APIRequestContext } from '@playwright/test';
import { Buffer } from 'buffer';
import { EnvConfig } from '../config/env.config';
import { ExcelReader } from './excelReader';
import { AuthCredential, OAuth2Config } from './types';
import { VariableStore } from './variableStore';

export interface AuthResult {
  authType: string;
  headers: Record<string, string>;
}

export class AuthResolver {
  static async resolve(authRef: string | undefined, request: APIRequestContext): Promise<AuthResult> {
    const credential = ExcelReader.getAuthCredential(authRef || 'AUTH_NONE');
    if (!credential) return { authType: 'None', headers: {} };

    const authType = String(credential.AuthType || 'None').trim();
    if (!this.isActive(credential)) return { authType: `${authType} (inactive)`, headers: {} };

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

  private static basic(credential: AuthCredential): Record<string, string> {
    const username = EnvConfig.resolveSecretOrValue(credential.Username);
    const password = EnvConfig.resolveSecretOrValue(credential.Password);
    const encoded = Buffer.from(`${username}:${password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  private static bearer(token: unknown): Record<string, string> {
    const resolvedToken = VariableStore.resolve(EnvConfig.resolveSecretOrValue(token));
    return resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {};
  }

  private static apiKey(credential: AuthCredential): Record<string, string> {
    const apiKey = EnvConfig.resolveSecretOrValue(credential.APIKey);
    return apiKey ? { 'x-api-key': apiKey } : {};
  }

  private static async oauth2(credential: AuthCredential, request: APIRequestContext): Promise<Record<string, string>> {
    const configId = String(credential.Token || credential.APIKey || '').trim();
    const oauthConfig = ExcelReader.getOAuth2Config(configId);

    if (!oauthConfig) {
      return this.bearer(credential.Token);
    }

    const token = oauthConfig.AccessToken
      ? EnvConfig.resolveSecretOrValue(oauthConfig.AccessToken)
      : await this.fetchOAuth2Token(oauthConfig, request);

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private static async fetchOAuth2Token(config: OAuth2Config, request: APIRequestContext): Promise<string> {
    if (!config.TokenURL) return '';

    const response = await request.post(String(config.TokenURL), {
      form: {
        grant_type: String(config.GrantType || 'client_credentials'),
        client_id: EnvConfig.resolveSecretOrValue(config.ClientID),
        client_secret: EnvConfig.resolveSecretOrValue(config.ClientSecret, true),
        scope: EnvConfig.resolveSecretOrValue(config.Scope)
      }
    });

    const body = await response.json().catch(() => ({}));
    const accessToken = body.access_token ? String(body.access_token) : '';
    if (accessToken) VariableStore.set('OAUTH_ACCESS_TOKEN', accessToken);
    return accessToken;
  }

  private static isActive(credential: AuthCredential): boolean {
    const value = credential.IsActive;
    if (value === undefined || value === null || value === '') return true;
    return !['false', 'no', '0', 'inactive'].includes(String(value).trim().toLowerCase());
  }
}
