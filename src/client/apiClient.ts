import { APIRequestContext, APIResponse } from '@playwright/test';
import { ExcelReader } from '../utils/excelReader';
import { Logger } from '../utils/logger';
import { appendQueryParams, applyPathParams, parseKeyValueList, parseRequestBody } from '../utils/parser';
import { AssertionEngine } from '../utils/assertionEngine';
import { AuthResolver } from '../utils/authResolver';
import { readJsonPath } from '../utils/jsonPath';
import { ApiTestCase, HttpMethod, RequestBuildResult } from '../utils/types';
import { VariableStore } from '../utils/variableStore';

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async executeTestCase(tc: ApiTestCase): Promise<APIResponse> {
    const built = await this.buildRequest(tc);
    Logger.logPayload(built.data);

    const startedAt = Date.now();
    const response = await this.request.fetch(built.url, {
      method: built.method,
      headers: built.headers,
      data: built.data
    });
    const durationMs = Date.now() - startedAt;
    VariableStore.set('ResponseTime', durationMs);
    VariableStore.set('Status', response.status());

    await Logger.logResponse(response, durationMs);
    return response;
  }

  async assertResponse(response: APIResponse, tc: ApiTestCase): Promise<void> {
    await AssertionEngine.assertResponse(response, tc);
  }

  async extractVariables(response: APIResponse, tc: ApiTestCase): Promise<void> {
    const mappings = String(tc.ExtractVariables || '').trim();
    if (!mappings) return;

    const bodyText = await response.text();
    const jsonBody = bodyText ? tryJson(bodyText) : undefined;
    const headers = response.headers();

    for (const mapping of mappings.split(/[;\n]/).map((part) => part.trim()).filter(Boolean)) {
      const [sourceRaw, targetRaw] = mapping.split('->').map((part) => part?.trim());
      if (!sourceRaw || !targetRaw) continue;

      const value = sourceRaw.toLowerCase().startsWith('header:')
        ? headers[sourceRaw.slice('header:'.length).trim().toLowerCase()]
        : readJsonPath(jsonBody, sourceRaw);

      VariableStore.set(targetRaw, value);
      Logger.logExtraction(sourceRaw, targetRaw, value);
    }
  }

  private async buildRequest(tc: ApiTestCase): Promise<RequestBuildResult> {
    const method = String(tc.Method || 'GET').toUpperCase() as HttpMethod;
    const baseUrl = ExcelReader.getConfigValue(String(tc.BaseURL || ''));
    const endpoint = applyPathParams(String(tc.Endpoint || ''), tc.PathParams);
    const url = new URL(endpoint, `${baseUrl}/`);
    appendQueryParams(url, tc.QueryParams);

    const headers = {
      ...parseKeyValueList(tc.Headers),
      ...parseCookieHeader(tc.Cookies)
    };
    const auth = await AuthResolver.resolve(String(tc.AuthRef || 'AUTH_NONE'), this.request);
    const mergedHeaders = { ...headers, ...auth.headers };
    const data = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? parseRequestBody(tc.RequestBody) : undefined;

    Logger.logRequest(method, url.toString(), mergedHeaders, auth.authType);

    return {
      method,
      url: url.toString(),
      headers: mergedHeaders,
      data
    };
  }
}

function parseCookieHeader(input?: unknown): Record<string, string> {
  const cookies = parseKeyValueList(input);
  if (Object.keys(cookies).length === 0) return {};

  return {
    Cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')
  };
}

function tryJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
