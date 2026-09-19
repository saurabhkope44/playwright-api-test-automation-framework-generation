export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiTestCase {
  TestCaseID: string;
  Module: string;
  SubModule: string;
  TestCaseName: string;
  Description?: string;
  Method: HttpMethod | string;
  BaseURL?: string;
  Endpoint: string;
  PathParams?: string;
  QueryParams?: string;
  RequestFormat?: string;
  RequestBody?: string;
  Headers?: string;
  Cookies?: string;
  AuthRef?: string;
  ExpectedStatus?: number | string;
  ExpectedResponseFormat?: string;
  TestType?: string;
  DependsOn?: string;
  ExtractVariables?: string;
  Assertions?: string;
  Priority?: string;
  Enabled?: boolean | string;
  Tags?: string;
  Notes?: string;
  [key: string]: unknown;
}

export interface AuthCredential {
  AuthRef: string;
  AuthType: string;
  Username?: string;
  Password?: string;
  Token?: string;
  APIKey?: string;
  IsActive?: boolean | string;
  [key: string]: unknown;
}

export interface OAuth2Config {
  OAuth2ConfigID: string;
  GrantType: string;
  TokenURL?: string;
  ClientID?: string;
  ClientSecret?: string;
  Scope?: string;
  AccessToken?: string;
  RefreshToken?: string;
  TokenType?: string;
  [key: string]: unknown;
}

export interface RequestBuildResult {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  data?: unknown;
}
